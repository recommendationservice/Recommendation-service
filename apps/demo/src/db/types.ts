import type { profiles } from "./tables/profiles";
import type { movies } from "./tables/movies";
import type { genres } from "./tables/genres";
import type { movieGenres } from "./tables/movie-genres";
import type { likes } from "./tables/likes";
import type { bookmarks } from "./tables/bookmarks";

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;

export type Genre = typeof genres.$inferSelect;
export type NewGenre = typeof genres.$inferInsert;

export type MovieGenre = typeof movieGenres.$inferSelect;
export type NewMovieGenre = typeof movieGenres.$inferInsert;

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
