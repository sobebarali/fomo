import { env } from "@fomo/env/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: Drizzle's `drizzle(client, { schema })` needs the whole schema object.
import * as schema from "./schema";

export function createDb(connectionString: string = env.DATABASE_URL) {
  return drizzle(connectionString, { schema });
}

/**
 * The injectable DB handle. Handlers take this off the oRPC context so tests can pass a
 * PGlite-backed db (`@fomo/db/testing`) instead of the real Postgres connection.
 */
export type Db = NodePgDatabase<typeof schema>;

export const db: Db = createDb();
