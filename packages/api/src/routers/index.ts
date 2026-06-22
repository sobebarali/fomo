import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { chartRouter } from "./chart";
import { holdersRouter } from "./holders";
import { portfolioRouter } from "./portfolio";
import { swapRouter } from "./swap";
import { tokensRouter } from "./tokens";
import { tradesRouter } from "./trades";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  auth: authRouter,
  tokens: tokensRouter,
  trades: tradesRouter,
  chart: chartRouter,
  holders: holdersRouter,
  portfolio: portfolioRouter,
  swap: swapRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
