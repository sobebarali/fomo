import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { authRouter } from "./auth";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  auth: authRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
