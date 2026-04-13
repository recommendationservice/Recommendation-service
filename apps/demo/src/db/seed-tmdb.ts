import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { movies } from "./tables/movies";
import { genres } from "./tables/genres";
import { movieGenres } from "./tables/movie-genres";

// --- Config ---

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const LANGUAGE = "uk-UA";
const MOVIES_PER_PAGE = 20;
const DELAY_BETWEEN_REQUESTS_MS = 50;
const RECO_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const DB_BATCH_SIZE = 100;

function getConfig() {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    throw new Error("TMDB_API_KEY is not configured. Get one at https://www.themoviedb.org/settings/api");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  const targetCount = Number(process.env.TMDB_MOVIE_COUNT) || 10_000;
  const skipReco = process.env.SKIP_RECO === "true";
  return { tmdbApiKey, databaseUrl, targetCount, skipReco };
}

// --- TMDB API ---

type TmdbGenre = { id: number; name: string };
type TmdbMovie = {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
};
type TmdbResponse = { page: number; total_pages: number; results: TmdbMovie[] };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tmdbFetch<T>(path: string, apiKey: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", LANGUAGE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url.toString());
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "2");
      console.warn(`  Rate limited, waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`TMDB ${res.status} ${res.statusText} for ${path}`);
    return res.json() as T;
  }
  throw new Error(`TMDB failed after ${MAX_RETRIES} retries for ${path}`);
}

async function fetchTmdbGenres(apiKey: string): Promise<Map<number, string>> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list", apiKey);
  return new Map(data.genres.map((g) => [g.id, g.name]));
}

// --- Reco Service ---

type RecoApp = { request: (path: string, init: RequestInit) => Response | Promise<Response> };

async function indexInReco(
  app: RecoApp,
  movie: { id: string; title: string; description: string; genreNames: string[] },
): Promise<boolean> {
  const textForEmbedding = `${movie.title}. ${movie.description}. Жанри: ${movie.genreNames.join(", ")}.`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await app.request("/api/v1/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: movie.id,
          type: "movie",
          textForEmbedding,
          metadata: { title: movie.title },
        }),
      });
      if (res.status === 201 || res.status === 200) return true;
      const body = await res.text();
      if (res.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
      console.warn(`  Reco failed for "${movie.title}": ${res.status} ${body.slice(0, 100)}`);
      return false;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
      console.warn(`  Reco error for "${movie.title}": ${err}`);
      return false;
    }
  }
  return false;
}

async function indexBatchInReco(app: RecoApp, items: Parameters<typeof indexInReco>[1][]) {
  let indexed = 0;
  for (let i = 0; i < items.length; i += RECO_CONCURRENCY) {
    const chunk = items.slice(i, i + RECO_CONCURRENCY);
    const results = await Promise.all(chunk.map((m) => indexInReco(app, m)));
    indexed += results.filter(Boolean).length;
  }
  return indexed;
}

// --- DB helpers ---

type SeedDb = ReturnType<typeof drizzle>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function insertMovieBatch(
  db: SeedDb,
  tmdbMovies: TmdbMovie[],
  tmdbGenreMap: Map<number, string>,
  dbGenreMap: Map<string, string>,
) {
  const movieValues = tmdbMovies
    .filter((m) => m.release_date)
    .map((m) => ({
      tmdbId: m.id,
      title: m.title,
      year: parseInt(m.release_date.slice(0, 4)) || 2000,
      rating: Math.round(m.vote_average * 10) / 10,
      posterUrl: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : null,
      description: m.overview || "",
      trailerUrl: null,
      cast: null as string[] | null,
    }));

  if (movieValues.length === 0) return [];

  const inserted = await db
    .insert(movies)
    .values(movieValues)
    .onConflictDoNothing({ target: movies.tmdbId })
    .returning({ id: movies.id, tmdbId: movies.tmdbId, title: movies.title, description: movies.description });

  // Build genre links
  if (inserted.length > 0) {
    const tmdbIdToDbId = new Map(inserted.map((m) => [m.tmdbId!, m.id]));
    const genreLinks: { movieId: string; genreId: string }[] = [];
    const movieGenreNames = new Map<string, string[]>();

    for (const tmdbMovie of tmdbMovies) {
      const dbId = tmdbIdToDbId.get(tmdbMovie.id);
      if (!dbId) continue;

      const names: string[] = [];
      for (const gid of tmdbMovie.genre_ids) {
        const genreName = tmdbGenreMap.get(gid);
        if (!genreName) continue;
        const dbGenreId = dbGenreMap.get(genreName);
        if (!dbGenreId) continue;
        genreLinks.push({ movieId: dbId, genreId: dbGenreId });
        names.push(genreName);
      }
      movieGenreNames.set(dbId, names);
    }

    if (genreLinks.length > 0) {
      await db.insert(movieGenres).values(genreLinks).onConflictDoNothing();
    }

    // Return inserted movies with their genre names for reco indexing
    return inserted.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      genreNames: movieGenreNames.get(m.id) || [],
    }));
  }

  return [];
}

// --- Main: single-pass pipeline ---

async function main() {
  const config = getConfig();
  const client = postgres(config.databaseUrl);
  const db = drizzle(client);

  // Load reco app if needed
  let recoApp: RecoApp | null = null;
  if (!config.skipReco) {
    try {
      // Relative path: apps/demo/src/db/ → apps/recommendation-service/src/app
      const mod = await import("../../../recommendation-service/src/app");
      recoApp = mod.createApp();
      console.log("Reco service loaded (in-process)");
    } catch (err) {
      console.warn(`Could not load reco service: ${err}. Skipping reco indexing.`);
    }
  }

  try {
    // 1. Fetch and seed genres
    console.log("\nFetching TMDB genres...");
    const tmdbGenreMap = await fetchTmdbGenres(config.tmdbApiKey);
    console.log(`  Found ${tmdbGenreMap.size} genres`);

    const genreValues = Array.from(tmdbGenreMap.values()).map((name) => ({ name, slug: slugify(name) }));
    if (genreValues.length > 0) {
      await db.insert(genres).values(genreValues).onConflictDoNothing();
    }
    const allGenres = await db.select().from(genres);
    const dbGenreMap = new Map(allGenres.map((g) => [g.name, g.id]));

    // 2. Fetch movies page-by-page and process immediately
    console.log(`\nFetching and processing ${config.targetCount} movies...\n`);

    const seen = new Set<number>();
    let totalInserted = 0;
    let totalIndexed = 0;
    let totalProcessed = 0;
    const endpoints = ["/movie/popular", "/movie/top_rated"];
    let buffer: TmdbMovie[] = [];

    const processBatch = async (batch: TmdbMovie[]) => {
      // Insert into demo DB
      const insertedMovies = await insertMovieBatch(db, batch, tmdbGenreMap, dbGenreMap);
      totalInserted += insertedMovies.length;

      // Index in reco service immediately
      if (recoApp && insertedMovies.length > 0) {
        const toIndex = insertedMovies.filter((m) => m.description.trim().length > 0);
        const indexed = await indexBatchInReco(recoApp, toIndex);
        totalIndexed += indexed;
      }
    };

    for (const endpoint of endpoints) {
      if (totalProcessed >= config.targetCount) break;

      const firstPage = await tmdbFetch<TmdbResponse>(endpoint, config.tmdbApiKey, { page: "1" });
      const totalPages = Math.min(firstPage.total_pages, 500);
      const pagesNeeded = Math.min(totalPages, Math.ceil((config.targetCount - totalProcessed) / MOVIES_PER_PAGE));

      // Add first page results
      for (const m of firstPage.results) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          buffer.push(m);
        }
      }

      for (let page = 1; page <= pagesNeeded; page++) {
        // Fetch next page (skip page 1, already fetched)
        if (page > 1) {
          await sleep(DELAY_BETWEEN_REQUESTS_MS);
          const data = await tmdbFetch<TmdbResponse>(endpoint, config.tmdbApiKey, { page: String(page) });
          for (const m of data.results) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              buffer.push(m);
            }
          }
        }

        // Process buffer when it reaches batch size
        if (buffer.length >= DB_BATCH_SIZE) {
          const batch = buffer.splice(0, DB_BATCH_SIZE);
          await processBatch(batch);
          totalProcessed += batch.length;

          if (totalProcessed % 500 < DB_BATCH_SIZE || totalProcessed >= config.targetCount) {
            const recoStatus = recoApp ? `, indexed: ${totalIndexed}` : "";
            console.log(`  Processed ${totalProcessed} movies (inserted: ${totalInserted}${recoStatus})`);
          }
        }

        if (totalProcessed >= config.targetCount) break;
      }
    }

    // Process remaining buffer
    if (buffer.length > 0) {
      await processBatch(buffer);
      totalProcessed += buffer.length;
    }

    const recoStatus = recoApp ? `, indexed in reco: ${totalIndexed}` : "";
    console.log(`\nDone! Processed ${totalProcessed} movies, inserted: ${totalInserted}${recoStatus}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
