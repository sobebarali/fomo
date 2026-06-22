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

// Warm the token header — the only read `/trade/[address]` blocks on, so once cached, navigating to
// that token is instant.
async function warmHeader(address: string): Promise<void> {
  await client.tokens.get({ address }).catch(() => undefined);
}

// Warm the streamed panels too (chart / holders / trades), so they fill in from cache instead of
// cold-fetching when their tab/island mounts.
async function warmPanels(address: string): Promise<void> {
  await Promise.allSettled([
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

      // Phase 1: warm every header first (1 call each) so navigation to any trending token becomes
      // instant as fast as possible.
      for (const address of targets) {
        if (cancelled) {
          return;
        }
        await warmHeader(address);
      }

      // Phase 2: keep the headers fresh and warm the streamed panels, looping with a pause so passes
      // don't pile up.
      while (!cancelled) {
        for (const address of targets) {
          if (cancelled) {
            return;
          }
          await warmHeader(address);
          await warmPanels(address);
        }
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
