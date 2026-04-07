import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { movies } from "./movies";

export const likes = pgTable("likes", {
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  movieId: uuid("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.movieId] }),
]);
