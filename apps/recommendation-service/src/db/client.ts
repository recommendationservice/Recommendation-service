import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// prepare: false is required for Supabase pgbouncer transaction pooler (port 6543).
// Without it, prepared statements cache per-connection and silently fail across
// pooled connections, causing apparent tx commits to drop writes.
export const sql = postgres(connectionString, { prepare: false });
export const db = drizzle(sql, { schema });
