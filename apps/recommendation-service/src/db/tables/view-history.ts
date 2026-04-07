import { uuid, timestamp, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { recoSchema } from "../reco-schema";
import { userProfiles } from "./user-profiles";
import { content } from "./content";

export const viewHistory = recoSchema.table("view_history", {
  userId: uuid("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  contentId: uuid("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  viewCount: integer("view_count").notNull().default(1),
}, (table) => [
  primaryKey({ columns: [table.userId, table.contentId] }),
  index("idx_view_history_user").on(table.userId),
]);
