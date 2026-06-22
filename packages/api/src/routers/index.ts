import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { tokensRouter } from "./tokens";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  auth: authRouter,
  tokens: tokensRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
