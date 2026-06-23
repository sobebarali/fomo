import { defineNodeInstrumentation } from "evlog/next/instrumentation";

const evlogInstrumentation = defineNodeInstrumentation(
  () => import("./src/lib/evlog")
);

export const onRequestError = evlogInstrumentation.onRequestError;

export async function register() {
  await evlogInstrumentation.register();
  // Start the single market poller once per server process (Node runtime only, not edge).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMarketPoller } = await import("./src/server/market-poller");
    startMarketPoller();
  }
}
