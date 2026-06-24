"use client";

import { cn } from "@fomo/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { client } from "@/utils/orpc";
import { formatChange, formatPrice } from "./format";
import { ErrorBlock } from "./server-panels";
import { TokenLogo } from "./token-logo";
import type { Loadable, TokenSummary } from "./types";

interface Trending {
  items: TokenSummary[];
  nextCursor: string | null;
}

const PREFETCH_STALE_MS = 60_000;

function prefetchSilently(promise: Promise<unknown>) {
  promise.catch(() => undefined);
}

// Lives in the trade layout so it persists across token clicks; the active row is derived from the
// URL (usePathname) rather than a prop, since the layout doesn't see the `[address]` param. Seeds from
// the server result and goes live via the SSE `trending` channel (MarketStream writes ["trending"]);
// slow client polling remains only as a fallback if the stream is unavailable.
export function TrendingSidebar({ result }: { result: Loadable<Trending> }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
  const routePrefetched = useRef(new Set<string>());
  const activeAddress = pathname.split("/")[2] ?? "";
  const live = useQuery<Trending>({
    queryKey: ["trending"],
    queryFn: () => client.tokens.trending({ limit: 30, sort: "trending" }),
    initialData: result.data ?? undefined,
    refetchInterval: 120_000,
  });
  const items = live.data?.items ?? result.data?.items ?? null;
  const prefetchToken = useCallback(
    (address: string) => {
      if (!address) {
        return;
      }

      if (!routePrefetched.current.has(address)) {
        router.prefetch(`/trade/${address}`);
        routePrefetched.current.add(address);
      }

      prefetchSilently(
        queryClient.prefetchQuery({
          queryKey: ["token", address],
          queryFn: () => client.tokens.get({ address }),
          staleTime: PREFETCH_STALE_MS,
        })
      );
    },
    [queryClient, router]
  );

  useEffect(() => {
    prefetchToken(activeAddress);
  }, [activeAddress, prefetchToken]);

  return (
    <aside className="hidden min-h-0 border-white/10 border-r bg-[#0b0f10] lg:flex lg:flex-col">
      <div className="border-white/10 border-b p-3">
        <div className="grid grid-cols-3 border border-white/10 bg-[#101617] p-0.5 text-center text-[11px]">
          {["Trending", "Gainers", "New"].map((tab, index) => (
            <span
              className={cn(
                "px-2 py-1.5",
                index === 0 ? "bg-[#16e27b] text-[#07100b]" : "text-[#7d8b86]"
              )}
              key={tab}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items ? (
          <div className="flex flex-col">
            {items.map((token, index) => (
              <Link
                className={cn(
                  "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 border-white/5 border-b px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.04]",
                  token.address === activeAddress &&
                    "bg-[#16e27b]/10 ring-1 ring-[#16e27b]/60 ring-inset"
                )}
                href={`/trade/${token.address}`}
                key={token.address}
                onFocus={() => prefetchToken(token.address)}
                onPointerDown={() => prefetchToken(token.address)}
                onPointerEnter={() => prefetchToken(token.address)}
              >
                <span className="font-mono text-[#52605b] text-[10px]">
                  {index + 1}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <TokenLogo
                    logoUri={token.logoUri}
                    size={26}
                    symbol={token.symbol}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {token.symbol}
                    </span>
                    <span className="block truncate text-[#7d8b86]">
                      {token.name}
                    </span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block">{formatPrice(token.priceUsd)}</span>
                  <span
                    className={cn(
                      "block",
                      token.change24h >= 0 ? "text-[#16e27b]" : "text-[#f6465d]"
                    )}
                  >
                    {formatChange(token.change24h)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <ErrorBlock
            code={result.error}
            compact
            title="Trending unavailable"
          />
        )}
      </div>
    </aside>
  );
}
