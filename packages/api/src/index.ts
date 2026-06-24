import { os } from "@orpc/server";

import type { Context } from "./context";
import { routerError } from "./routers/_shared/errors";

export const o = os.$context<Context>();

export const publicProcedure = o;

/** Requires a verified Privy session; rejects with `UNAUTHORIZED` and narrows `context.auth` non-null. */
export const protectedProcedure = o.use(({ context, next }) => {
  if (!context.auth) {
    throw routerError("UNAUTHORIZED");
  }
  return next({ context: { auth: context.auth } });
});
