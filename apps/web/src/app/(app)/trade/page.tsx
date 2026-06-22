import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";
import { redirect } from "next/navigation";

// Wrapped SOL — last-resort fallback when trending is genuinely unavailable (always a real token page).
const FALLBACK_MINT = "So11111111111111111111111111111111111111112";

// `/trade` is the dashboard entry: there is no generic trading view, so land the user on the top
// trending token. Call the router in-process (no HTTP round-trip to our own /api/rpc) — that
// self-call broke in prod where the server port isn't 3001, sending everyone to the fallback mint.
export default async function TradeIndexPage() {
  const api = createRouterClient(appRouter, {
    context: { db, auth: null, session: null },
  });

  let target = FALLBACK_MINT;
  try {
    const trending = await api.tokens.trending({ limit: 1, sort: "trending" });
    target = trending.items[0]?.address ?? FALLBACK_MINT;
  } catch {
    // trending unavailable (e.g. rate-limited) — fall through to the fallback mint
  }
  redirect(`/trade/${target}`);
}
