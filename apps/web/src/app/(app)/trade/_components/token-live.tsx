"use client";

import { useQuery } from "@tanstack/react-query";
import {
  MobileStats,
  MobileTokenHeader,
  TokenHeaderPanel,
} from "./server-panels";
import type { TokenDetail } from "./types";

// Live token header: seeded by the server's `tokens.get` for an instant first paint, then updated by
// the SSE `token:<address>` channel (MarketStream writes ["token", address]). No client polling — the
// server poller is the single upstream caller. All three placements share the key, so one push
// updates them together.
function useLiveToken(
  address: string,
  initialToken: TokenDetail | null
): TokenDetail | null {
  const query = useQuery<TokenDetail | null>({
    queryKey: ["token", address],
    // SSE feeds the cache; never auto-fetch from the client.
    enabled: false,
    initialData: initialToken,
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
