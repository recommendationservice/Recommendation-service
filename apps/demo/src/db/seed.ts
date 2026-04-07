import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { genres } from "./tables/genres";
import { movies } from "./tables/movies";
import { movieGenres } from "./tables/movie-genres";
import { GENRES_DATA, MOVIES_DATA } from "./seed-data";

type SeedDb = ReturnType<typeof drizzle>;

async function seedGenres(db: SeedDb) {
  console.log("Seeding genres...");
  await db.insert(genres).values(GENRES_DATA).onConflictDoNothing();

  const allGenres = await db.select().from(genres);
  return new Map(allGenres.map((g) => [g.name, g.id]));
}

async function seedMovies(db: SeedDb, genreMap: Map<string, string>) {
  console.log("Seeding movies...");
  for (const movieData of MOVIES_DATA) {
    const { genres: movieGenreNames, ...movie } = movieData;

    const [inserted] = await db
      .insert(movies)
      .values(movie)
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      const genreLinks = movieGenreNames
        .map((name) => ({ movieId: inserted.id, genreId: genreMap.get(name)! }))
        .filter((link) => link.genreId);

      if (genreLinks.length > 0) {
        await db.insert(movieGenres).values(genreLinks).onConflictDoNothing();
      }
    }
  }
}

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  const genreMap = await seedGenres(db);
  await seedMovies(db, genreMap);

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
