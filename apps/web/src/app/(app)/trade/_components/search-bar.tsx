"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { client } from "@/utils/orpc";
import { formatAddress, formatPrice } from "./format";
import { TokenLogo } from "./token-logo";
import type { TokenSummary } from "./types";

const SOLANA_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_RESULTS = 8;

export function SearchBar() {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const trending = useQuery({
    enabled: open,
    queryFn: () => client.tokens.trending({ limit: 50, sort: "trending" }),
    queryKey: ["search-trending"],
    retry: false,
    staleTime: 60_000,
  });

  const query = value.trim();
  const isMint = SOLANA_MINT.test(query);
  const lower = query.toLowerCase();
  const matches: TokenSummary[] =
    query.length === 0
      ? []
      : (trending.data?.items ?? [])
          .filter(
            (token) =>
              token.symbol.toLowerCase().includes(lower) ||
              token.name.toLowerCase().includes(lower)
          )
          .slice(0, MAX_RESULTS);

  function go(address: string) {
    setOpen(false);
    setValue("");
    router.push(`/trade/${address}`);
  }

  const showDropdown = open && query.length > 0;

  return (
    <search className="relative w-[34rem]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isMint) {
            go(query);
            return;
          }
          if (matches[0]) {
            go(matches[0].address);
          }
        }}
      >
        <div className="flex h-8 items-center gap-2 border border-white/10 bg-[#101617] px-3 text-[#7d8b86] focus-within:border-[#16e27b]/60">
          <Search data-icon="inline-start" />
          <input
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            className="h-full w-full bg-transparent text-[#f2fff7] outline-none placeholder:text-[#7d8b86]"
            onBlur={() => setOpen(false)}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search token, symbol, or mint"
            role="combobox"
            type="text"
            value={value}
          />
        </div>
        {showDropdown ? (
          <output
            className="absolute top-full right-0 left-0 z-30 mt-1 flex flex-col border border-white/10 bg-[#101617] shadow-black/40 shadow-xl"
            id={listId}
          >
            {isMint ? (
              <button
                className="flex items-center gap-2 border-white/5 border-b px-3 py-2 text-left text-[#dce5df] text-xs hover:bg-white/[0.05]"
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(query);
                }}
                type="button"
              >
                <Search data-icon="inline-start" />
                <span>Open mint {formatAddress(query)}</span>
              </button>
            ) : null}
            {matches.map((token) => (
              <button
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 border-white/5 border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-white/[0.05]"
                key={token.address}
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(token.address);
                }}
                type="button"
              >
                <TokenLogo
                  logoUri={token.logoUri}
                  size={26}
                  symbol={token.symbol}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#f2fff7]">
                    {token.symbol}
                  </span>
                  <span className="block truncate text-[#7d8b86]">
                    {token.name}
                  </span>
                </span>
                <span className="text-right text-[#dce5df]">
                  {formatPrice(token.priceUsd)}
                </span>
              </button>
            ))}
            {matches.length === 0 && !isMint ? (
              <p className="px-3 py-3 text-[#7d8b86] text-xs">
                {trending.isPending
                  ? "Searching trending tokens…"
                  : "No trending match. Paste a token mint to open it."}
              </p>
            ) : null}
          </output>
        ) : null}
      </form>
    </search>
  );
}
