import type { AppRouterClient } from "@fomo/api/routers/index";
import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";
import { redirect } from "next/navigation";

// Wrapped SOL — last-resort fallback when trending is genuinely unavailable (always a real token page).
const FALLBACK_MINT = "So11111111111111111111111111111111111111112";

// `/trade` is the dashboard entry: there is no generic trading view, so land the user on the top
// trending token. Call the router in-process (no HTTP round-trip to our own /api/rpc).
// BirdEye free-tier intermittently 429s; one quick retry turns most transient rate-limits into a
// real trending token instead of dumping the user on the SOL fallback.
async function topTrendingMint(api: AppRouterClient): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const trending = await api.tokens.trending({
        limit: 1,
        sort: "trending",
      });
      return trending.items[0]?.address ?? FALLBACK_MINT;
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
  }
  return FALLBACK_MINT;
}

export default async function TradeIndexPage() {
  const api = createRouterClient(appRouter, {
    context: { db, auth: null, session: null },
  });

  redirect(`/trade/${await topTrendingMint(api)}`);
}
