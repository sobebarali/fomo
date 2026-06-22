import type { Db } from "@fomo/db";

import type { Context } from "../context";
import type { AuthSession } from "../integrations/privy/schema";

/**
 * An oRPC context for integration tests — the PGlite db from `createTestDb` injected. Pass a fake
 * `auth` session to exercise `protectedProcedure` without a real Privy call; omit it for an
 * anonymous context. Call procedures with `call(appRouter.x.y, input, { context: testContext(db) })`.
 */
export function testContext(db: Db, auth: AuthSession | null = null): Context {
  return { db, auth, session: null };
}
