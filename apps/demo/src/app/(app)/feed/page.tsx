import { eq, inArray, desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, profiles, movies, movieGenres, genres } from "@/db";
import { FeedContent } from "@/features/feed";

const SESSION_COOKIE = "demo-session";

async function getMoviesWithGenres() {
  const allMovies = await db
    .select({
      id: movies.id,
      title: movies.title,
      year: movies.year,
      rating: movies.rating,
      posterUrl: movies.posterUrl,
      description: movies.description,
      trailerUrl: movies.trailerUrl,
      cast: movies.cast,
    })
    .from(movies)
    .orderBy(desc(movies.rating))
    .limit(50);

  const movieIds = allMovies.map((m) => m.id);
  if (movieIds.length === 0) return [];

  const genreData = await db
    .select({
      movieId: movieGenres.movieId,
      genreName: genres.name,
    })
    .from(movieGenres)
    .innerJoin(genres, eq(movieGenres.genreId, genres.id))
    .where(inArray(movieGenres.movieId, movieIds));

  const genreMap = new Map<string, string[]>();
  for (const row of genreData) {
    const arr = genreMap.get(row.movieId) || [];
    arr.push(row.genreName);
    genreMap.set(row.movieId, arr);
  }

  return allMovies.map((m) => ({
    ...m,
    genre: genreMap.get(m.id) || [],
  }));
}

export default async function FeedRoute() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    redirect("/auth");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, sessionId),
  });

  if (!profile) {
    redirect("/auth");
  }

  const movieList = await getMoviesWithGenres();

  return (
    <FeedContent
      displayName={profile.displayName}
      avatarUrl={profile.avatarUrl}
      movies={movieList}
    />
  );
}
