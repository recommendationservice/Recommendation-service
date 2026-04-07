import { uuid, text, timestamp, doublePrecision, integer, vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { recoSchema } from "../reco-schema";
import { EMBEDDING_DIMENSIONS } from "../constants";

export const userProfiles = recoSchema.table("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalUserId: text("external_user_id").notNull().unique(),
  preferenceVector: vector("preference_vector", { dimensions: EMBEDDING_DIMENSIONS }),
  totalWeight: doublePrecision("total_weight").notNull().default(0),
  totalEvents: integer("total_events").notNull().default(0),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => sql`now()`),
});
