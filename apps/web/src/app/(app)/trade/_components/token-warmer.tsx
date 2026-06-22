"use client";

import { useEffect } from "react";

import { client } from "@/utils/orpc";

// Pre-load every trending token's page data into the server cache so switching to any of them is
// instant. BirdEye's free tier is ~1 req/s, so a full warm pass takes a couple minutes — but a warm
// token renders from cache (no rate-limit token), and once cached it stays served via
// stale-while-revalidate, so a first click is instant even before the next refresh lands.
const START_DELAY_MS = 1500;
const COOLDOWN_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mirror the reads `/trade/[address]` makes server-side so the cache keys line up.
async function warmToken(address: string): Promise<void> {
  await Promise.allSettled([
    client.tokens.get({ address }),
    client.chart.candles({ address, interval: "15m" }),
    client.holders.list({ address, limit: 20 }),
    client.trades.recent({ address, limit: 30 }),
  ]);
}

export function TokenWarmer({ addresses }: { addresses: string[] }) {
  const key = addresses.join(",");

  useEffect(() => {
    const targets = key ? key.split(",") : [];
    if (targets.length === 0) {
      return;
    }

    let cancelled = false;

    async function run() {
      // Let the token the user landed on render first — it shares the rate limiter.
      await sleep(START_DELAY_MS);
      while (!cancelled) {
        for (const address of targets) {
          if (cancelled) {
            return;
          }
          await warmToken(address);
        }
        // Re-warm after a pause so the cache keeps refreshing without passes piling up.
        await sleep(COOLDOWN_MS);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return null;
}
