import { PGlite } from "@electric-sql/pglite";
import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";

import type { Db } from "./index";
// biome-ignore lint/performance/noNamespaceImport: Drizzle's `drizzle(client, { schema })` needs the whole schema object.
import * as schema from "./schema";

/**
 * A fresh in-process Postgres (PGlite) with the current Drizzle schema applied — the
 * Postgres analog of an in-memory Mongo. Test-only: integration tests get a real DB
 * (real constraints, real SQL) without Docker. Call in `beforeAll`, `close()` in `afterAll`,
 * and reset rows between tests (`db.delete(table)`), per `packages/config/AGENTS.md`.
 */
export async function createTestDb(): Promise<{
  db: Db;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const { apply } = await pushSchema(
    schema as Record<string, unknown>,
    db as unknown as Parameters<typeof pushSchema>[1]
  );
  await apply();
  return { db: db as unknown as Db, close: () => client.close() };
}
