import "server-only";

import type { AppRouterClient } from "@fomo/api/routers/index";
import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";

import { hasSubscribers, publish, watchedTokens } from "./sse-hub";

// One server-side poll per tick fans out to every connected client (independent of client count).
// Reads go through the in-process router → `market` facade → shared SWR cache, so the poller is the
// single upstream caller; clients just receive pushes. Bounded to the trending set + actively-watched
// tokens so it never hammers the free providers.
const POLL_MS = 8000;
const TRADES_PER_TOKEN = 30;

let started = false;

function buildApi(): AppRouterClient {
  return createRouterClient(appRouter, {
    context: { db, auth: null, session: null },
  });
}

async function tick(api: AppRouterClient): Promise<void> {
  if (!hasSubscribers()) {
    return; // nobody connected — skip the upstream calls entirely
  }

  const trending = await api.tokens
    .trending({ limit: 30, sort: "trending" })
    .catch(() => null);
  if (trending) {
    publish("trending", trending);
  }

  await Promise.all(
    watchedTokens().map(async (address) => {
      const [token, trades] = await Promise.allSettled([
        api.tokens.get({ address }),
        api.trades.recent({ address, limit: TRADES_PER_TOKEN }),
      ]);
      if (token.status === "fulfilled") {
        publish(`token:${address}`, token.value);
      }
      if (trades.status === "fulfilled") {
        publish(`trades:${address}`, trades.value);
      }
    })
  );
}

/** Start the single background poll loop (idempotent — survives HMR / double register). */
export function startMarketPoller(): void {
  if (started) {
    return;
  }
  started = true;
  const api = buildApi();
  setInterval(() => {
    // A bad tick must never kill the loop.
    tick(api).catch(() => undefined);
  }, POLL_MS);
}
