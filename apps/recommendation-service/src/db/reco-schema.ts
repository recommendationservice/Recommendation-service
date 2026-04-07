import { pgSchema } from "drizzle-orm/pg-core";

const schemaName = process.env.DB_SCHEMA ?? "reco";

export const recoSchema = pgSchema(schemaName);
