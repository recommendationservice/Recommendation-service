import { uuid, text, timestamp, boolean, jsonb, index, vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { recoSchema } from "../reco-schema";
import { EMBEDDING_DIMENSIONS } from "../constants";

export const content = recoSchema.table("content", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  type: text("type").notNull(),
  textForEmbedding: text("text_for_embedding").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => sql`now()`),
}, (table) => [
  index("idx_content_type_active").on(table.type).where(sql`${table.isActive} = true`),
]);
