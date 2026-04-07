import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { movies } from "./movies";
import { genres } from "./genres";

export const movieGenres = pgTable("movie_genres", {
  movieId: uuid("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
  genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.movieId, table.genreId] }),
]);
