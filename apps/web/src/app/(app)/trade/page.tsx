import { redirect } from "next/navigation";

import { client } from "@/utils/orpc";

// Wrapped SOL — safe fallback when trending is unavailable (always resolves to a real token page).
const FALLBACK_MINT = "So11111111111111111111111111111111111111112";

// `/trade` is the dashboard entry: there is no generic trading view, so land the user on the
// top trending token. The list/banners switch tokens from there.
export default async function TradeIndexPage() {
  let target = FALLBACK_MINT;
  try {
    const trending = await client.tokens.trending({
      limit: 1,
      sort: "trending",
    });
    target = trending.items[0]?.address ?? FALLBACK_MINT;
  } catch {
    // trending unavailable (e.g. rate-limited) — fall through to the fallback mint
  }
  redirect(`/trade/${target}`);
}
