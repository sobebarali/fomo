"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { client } from "@/utils/orpc";
import { TokenBanner, type TokenSummary } from "./token-banner";

// Keeps the marquee presentational (it still just takes `tokens`) while feeding it live data: seeded
// by the server result, then polled. Shares the ["trending-sidebar"] query key with the sidebar, so
// the sidebar + both banners update from a single poll.
export function LiveTokenBanner({
  initial,
  reverse = false,
}: {
  initial: TokenSummary[];
  reverse?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const live = useQuery({
    enabled: mounted,
    initialData: initial.length
      ? { items: initial, nextCursor: null }
      : undefined,
    queryFn: () => client.tokens.trending({ limit: 30, sort: "trending" }),
    queryKey: ["trending-sidebar"],
    refetchInterval: mounted ? 30_000 : false,
    staleTime: 30_000,
  });

  return <TokenBanner reverse={reverse} tokens={live.data?.items ?? initial} />;
}
