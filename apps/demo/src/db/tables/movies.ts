import { pgTable, uuid, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const movies = pgTable("movies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tmdbId: integer("tmdb_id").unique(),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  rating: real("rating").notNull(),
  posterUrl: text("poster_url"),
  description: text("description").notNull(),
  trailerUrl: text("trailer_url"),
  cast: text("cast").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => sql`now()`),
});
