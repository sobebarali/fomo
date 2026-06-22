import type { Db } from "@fomo/db";
import type { NextRequest } from "next/server";

import { privy } from "./integrations/privy";

export interface CreateContextOptions {
  /**
   * The DB handle for this request. The route handler injects the real Postgres `db`;
   * integration tests inject a PGlite-backed db via `@fomo/api/test-support/context`.
   */
  db: Db;
}

export async function createContext(
  req: NextRequest,
  { db }: CreateContextOptions
) {
  return {
    db,
    auth: await privy.verifyToken(req),
    session: null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
