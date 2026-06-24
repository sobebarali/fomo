import "server-only";

import type { AppRouterClient } from "@fomo/api/routers/index";
import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";

import { hasSubscribers, publish, watchedTokens } from "./sse-hub";

// One server-side poll per tick fans out to every connected client (independent of client count).
// Reads go through the in-process router → `market` facade → shared SWR cache, so the poller is the
// single upstream caller; clients just receive pushes. Keep this deliberately slow: active page reads
// (chart/trades) must not sit behind background refreshes in the shared provider limiter.
const POLL_MS = 30_000;

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
      const token = await api.tokens.get({ address }).catch(() => null);
      if (token) {
        publish(`token:${address}`, token);
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
