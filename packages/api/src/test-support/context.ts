import type { Db } from "@fomo/db";

import type { Context } from "../context";

/**
 * An oRPC context for integration tests — the PGlite db from `createTestDb` injected, no
 * session. Authed variants (a logged-in Privy user) land here when the `auth` router exists.
 * Call procedures with `call(appRouter.x.y, input, { context: testContext(db) })`.
 */
export function testContext(db: Db): Context {
  return { db, auth: null, session: null };
}
