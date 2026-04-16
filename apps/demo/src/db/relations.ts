import { relations } from "drizzle-orm";
import { profiles } from "./tables/profiles";
import { movies } from "./tables/movies";
import { genres } from "./tables/genres";
import { movieGenres } from "./tables/movie-genres";
import { likes } from "./tables/likes";
import { bookmarks } from "./tables/bookmarks";
import { dislikes } from "./tables/dislikes";

export const profilesRelations = relations(profiles, ({ many }) => ({
  likes: many(likes),
  bookmarks: many(bookmarks),
  dislikes: many(dislikes),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  movieGenres: many(movieGenres),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  movieGenres: many(movieGenres),
  likes: many(likes),
  bookmarks: many(bookmarks),
  dislikes: many(dislikes),
}));

export const movieGenresRelations = relations(movieGenres, ({ one }) => ({
  movie: one(movies, { fields: [movieGenres.movieId], references: [movies.id] }),
  genre: one(genres, { fields: [movieGenres.genreId], references: [genres.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(profiles, { fields: [likes.userId], references: [profiles.id] }),
  movie: one(movies, { fields: [likes.movieId], references: [movies.id] }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(profiles, { fields: [bookmarks.userId], references: [profiles.id] }),
  movie: one(movies, { fields: [bookmarks.movieId], references: [movies.id] }),
}));

export const dislikesRelations = relations(dislikes, ({ one }) => ({
  user: one(profiles, { fields: [dislikes.userId], references: [profiles.id] }),
  movie: one(movies, { fields: [dislikes.movieId], references: [movies.id] }),
}));
