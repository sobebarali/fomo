"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import {
  MobileStats,
  MobileTokenHeader,
  TokenHeaderPanel,
} from "./server-panels";
import type { TokenDetail, TokenView } from "./types";

interface Trending {
  items: TokenView[];
  nextCursor: string | null;
}

// Live token header: seeded by the server's `tokens.get` for an instant first paint. SSE
// (`token:<address>` → MarketStream writes ["token", address]) updates it instantly when the stream
// flushes; a slow poll is the reliable fallback (Railway buffers SSE intermittently). Rate-safe — the
// server cache dedups upstream to ~1/TTL regardless of clients. All three placements share the key.
function useLiveToken(
  address: string,
  initialToken: TokenDetail | null
): TokenView | null {
  const queryClient = useQueryClient();
  const query = useQuery<TokenView | null>({
    queryKey: ["token", address],
    queryFn: () => client.tokens.get({ address }),
    initialData: initialToken ?? undefined,
    placeholderData: () => {
      const cached = queryClient.getQueryData<TokenView | null>([
        "token",
        address,
      ]);
      if (cached) {
        return cached;
      }
      return queryClient
        .getQueryData<Trending>(["trending"])
        ?.items.find((token) => token.address === address);
    },
    refetchInterval: 60_000,
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
