"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { client } from "@/utils/orpc";
import {
  MobileStats,
  MobileTokenHeader,
  TokenHeaderPanel,
} from "./server-panels";
import type { TokenDetail } from "./types";

// Live token header: seeded by the server's `tokens.get` for an instant first paint, then polled so
// the price/stats update in place. All three placements share the ["token", address] key, so
// TanStack Query dedupes them into a single poll.
function useLiveToken(
  address: string,
  initialToken: TokenDetail | null
): TokenDetail | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const query = useQuery({
    enabled: mounted,
    initialData: initialToken ?? undefined,
    queryFn: () => client.tokens.get({ address }),
    queryKey: ["token", address],
    refetchInterval: mounted ? 10_000 : false,
    staleTime: 10_000,
  });

  return query.data ?? initialToken;
}

export function LiveMobileTokenHeader({
  address,
  initialToken,
}: {
  address: string;
  initialToken: TokenDetail | null;
}) {
  return <MobileTokenHeader token={useLiveToken(address, initialToken)} />;
}

export function LiveTokenHeaderPanel({
  address,
  initialToken,
}: {
  address: string;
  initialToken: TokenDetail | null;
}) {
  return <TokenHeaderPanel token={useLiveToken(address, initialToken)} />;
}

export function LiveMobileStats({
  address,
  initialToken,
}: {
  address: string;
  initialToken: TokenDetail | null;
}) {
  return <MobileStats token={useLiveToken(address, initialToken)} />;
}
