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
const WARM_MS = 60_000;
const WARM_TOP_TOKENS = 5;
const WARM_TRADES_LIMIT = 20;
const CHART_INTERVAL_SECONDS = 900;
const CHART_LOOKBACK_SECONDS = 86_400;

let started = false;
let lastWarmAt = 0;

function buildApi(): AppRouterClient {
  return createRouterClient(appRouter, {
    context: { db, auth: null, session: null },
  });
}

function defaultChartWindow() {
  const now = Math.floor(Date.now() / 1000);
  const to = Math.floor(now / CHART_INTERVAL_SECONDS) * CHART_INTERVAL_SECONDS;
  return { from: to - CHART_LOOKBACK_SECONDS, to };
}

async function warmTopTokens(
  api: AppRouterClient,
  addresses: string[]
): Promise<void> {
  if (addresses.length === 0) {
    return;
  }

  const window = defaultChartWindow();
  await Promise.allSettled(
    addresses.map((address) =>
      Promise.allSettled([
        api.chart.candles({
          address,
          from: window.from,
          interval: "15m",
          to: window.to,
        }),
        api.trades.recent({ address, limit: WARM_TRADES_LIMIT }),
      ])
    )
  );
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
    const now = Date.now();
    if (now - lastWarmAt >= WARM_MS) {
      lastWarmAt = now;
      warmTopTokens(
        api,
        trending.items.slice(0, WARM_TOP_TOKENS).map((token) => token.address)
      ).catch(() => undefined);
    }
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
