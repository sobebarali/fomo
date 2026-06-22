import type { Db } from "@fomo/db";
import type { NextRequest } from "next/server";

export interface CreateContextOptions {
  /**
   * The DB handle for this request. The route handler injects the real Postgres `db`;
   * integration tests inject a PGlite-backed db via `@fomo/api/test-support/context`.
   */
  db: Db;
}

// biome-ignore lint/suspicious/useAwait: async context factory — Privy token verification (await) lands here.
export async function createContext(
  _req: NextRequest,
  { db }: CreateContextOptions
) {
  return {
    db,
    auth: null,
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
