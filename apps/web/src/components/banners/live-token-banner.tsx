"use client";

import { useQuery } from "@tanstack/react-query";

import { client } from "@/utils/orpc";
import { TokenBanner, type TokenSummary } from "./token-banner";

interface Trending {
  items: TokenSummary[];
  nextCursor: string | null;
}

// Keeps the marquee presentational (still just takes `tokens`) while feeding it live data via the
// shared ["trending"] cache: SSE pushes update it instantly, a 30s poll is the reliable fallback. The
// sidebar shares the key, so this dedups to one upstream fetch.
export function LiveTokenBanner({
  initial,
  reverse = false,
}: {
  initial: TokenSummary[];
  reverse?: boolean;
}) {
  const live = useQuery<Trending>({
    queryKey: ["trending"],
    queryFn: () => client.tokens.trending({ limit: 30, sort: "trending" }),
    initialData: { items: initial, nextCursor: null },
    refetchInterval: 30_000,
  });
  return <TokenBanner reverse={reverse} tokens={live.data?.items ?? initial} />;
}
