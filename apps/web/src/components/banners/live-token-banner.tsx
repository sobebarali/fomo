"use client";

import { useQuery } from "@tanstack/react-query";

import { TokenBanner, type TokenSummary } from "./token-banner";

interface Trending {
  items: TokenSummary[];
  nextCursor: string | null;
}

// Keeps the marquee presentational (still just takes `tokens`) while feeding it live data: seeds from
// the server result, then updates from the SSE `trending` channel (shared ["trending"] cache key — one
// push updates the sidebar and both banners). No client polling.
export function LiveTokenBanner({
  initial,
  reverse = false,
}: {
  initial: TokenSummary[];
  reverse?: boolean;
}) {
  const live = useQuery<Trending>({
    queryKey: ["trending"],
    enabled: false,
    initialData: { items: initial, nextCursor: null },
  });
  return <TokenBanner reverse={reverse} tokens={live.data?.items ?? initial} />;
}
