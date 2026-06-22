import { appRouter } from "@fomo/api/routers/index";
import { db } from "@fomo/db";
import { createRouterClient } from "@orpc/server";
import type { ReactNode } from "react";

import { TokenBanner } from "@/components/banners/token-banner";
import { FloatingAlert, TradeTopBar } from "./_components/server-panels";
import { TrendingSidebar } from "./_components/trending-sidebar";
import type {
  Loadable,
  MarketErrorCode,
  TokenSummary,
} from "./_components/types";

interface Trending {
  items: TokenSummary[];
  nextCursor: string | null;
}

function trendingErrorCode(error: unknown): MarketErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error;
    if (
      code === "BAD_REQUEST" ||
      code === "NOT_FOUND" ||
      code === "RATE_LIMITED"
    ) {
      return code;
    }
  }
  return "UPSTREAM_ERROR";
}

// Trending feeds the sidebar + top/bottom banners and is the same every token page, so it lives in
// the layout — fetched once and preserved across token navigations (the layout doesn't re-render
// when only the `[address]` child changes). 60s-cached server-side, so this is usually a cache hit.
async function loadTrending(): Promise<Loadable<Trending>> {
  const api = createRouterClient(appRouter, {
    context: { db, auth: null, session: null },
  });
  try {
    return {
      data: await api.tokens.trending({ limit: 30, sort: "trending" }),
      error: null,
    };
  } catch (error) {
    return { data: null, error: trendingErrorCode(error) };
  }
}

export default async function TradeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const trending = await loadTrending();
  const bannerTokens = trending.data?.items ?? [];

  return (
    <main className="dark min-h-svh bg-[#0b0f10] text-[#f2fff7]">
      <div className="hidden lg:block">
        <TokenBanner tokens={bannerTokens} />
      </div>
      <TradeTopBar />
      <FloatingAlert />
      <div className="grid lg:h-[calc(100svh-137px)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <TrendingSidebar result={trending} />
        {children}
      </div>
      <div className="hidden lg:block">
        <TokenBanner reverse tokens={bannerTokens} />
      </div>
    </main>
  );
}
