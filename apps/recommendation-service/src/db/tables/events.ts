import { uuid, text, timestamp, smallint, jsonb, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { recoSchema } from "../reco-schema";
import { content } from "./content";

export const events = recoSchema.table("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  contentId: uuid("content_id").notNull().references(() => content.id),
  eventType: text("event_type").notNull(),
  weight: smallint("weight").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_events_user").on(table.userId, table.createdAt.desc()),
  check("event_type_check", sql`${table.eventType} IN ('view', 'read', 'deep_read', 'like', 'share', 'dislike', 'bookmark')`),
]);
