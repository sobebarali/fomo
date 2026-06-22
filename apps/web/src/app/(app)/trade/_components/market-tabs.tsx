"use client";

import { cn } from "@fomo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { client } from "@/utils/orpc";
import {
  formatAddress,
  formatPrice,
  formatTime,
  formatTokenAmount,
  formatUsd,
} from "./format";
import type { Holder, TokenDetail, Trade } from "./types";

type Tab = "trades" | "holders" | "activity" | "about";

export function MarketTabs({
  address,
  holdersError,
  holders,
  initialTrades,
  token,
  variant = "desktop",
}: {
  address: string;
  holdersError: string | null;
  holders: Holder[];
  initialTrades: Trade[];
  token: TokenDetail | null;
  variant?: "desktop" | "mobile";
}) {
  const [active, setActive] = useState<Tab>("trades");
  const [pollLiveTrades, setPollLiveTrades] = useState(false);

  useEffect(() => {
    setPollLiveTrades(true);
  }, []);

  const trades = useQuery({
    enabled: active === "trades" && pollLiveTrades,
    initialData: { items: initialTrades },
    queryFn: () => client.trades.recent({ address, limit: 30 }),
    queryKey: ["trades", address],
    refetchInterval: active === "trades" && pollLiveTrades ? 15_000 : false,
    refetchOnMount: false,
    staleTime: 15_000,
  });

  const tabs: { label: string; value: Tab }[] =
    variant === "mobile"
      ? [
          { label: "Trades", value: "trades" },
          { label: "Holders", value: "holders" },
          { label: "About", value: "about" },
        ]
      : [
          { label: "Trades", value: "trades" },
          { label: "Holders", value: "holders" },
          { label: "My Activity", value: "activity" },
        ];

  return (
    <section className="bg-[#0b0f10]">
      <div className="grid grid-cols-3 border-white/10 border-b">
        {tabs.map((tab) => (
          <button
            className={cn(
              "h-10 border-white/10 border-r font-medium text-xs last:border-r-0",
              active === tab.value
                ? "bg-[#16e27b] text-[#07100b]"
                : "text-[#7d8b86]"
            )}
            key={tab.value}
            onClick={() => setActive(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[18rem]">
        {active === "trades" ? (
          <TradesTable
            isError={trades.isError}
            isFetching={trades.isFetching}
            trades={trades.data.items}
          />
        ) : null}
        {active === "holders" ? (
          <HoldersTable error={holdersError} holders={holders} />
        ) : null}
        {active === "activity" ? <ActivityEmpty /> : null}
        {active === "about" ? <AboutToken token={token} /> : null}
      </div>
    </section>
  );
}

function TradesTable({
  isError,
  isFetching,
  trades,
}: {
  isError: boolean;
  isFetching: boolean;
  trades: Trade[];
}) {
  if (isError) {
    return <EmptyState label="Live trades are unavailable." tone="red" />;
  }
  if (trades.length === 0) {
    return <EmptyState label="No recent trades returned for this token." />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[34rem] grid-cols-[4.5rem_1fr_1fr_1fr_5rem] border-white/10 border-b px-3 py-2 text-[#7d8b86] text-[11px] uppercase">
        <span>Side</span>
        <span>Price</span>
        <span>Amount</span>
        <span>Trader</span>
        <span className="text-right">{isFetching ? "Sync" : "Time"}</span>
      </div>
      {trades.map((trade, index) => (
        <div
          className="grid min-w-[34rem] grid-cols-[4.5rem_1fr_1fr_1fr_5rem] border-white/5 border-b px-3 py-2 font-mono text-xs"
          key={`${trade.txHash}-${index}`}
        >
          <span
            className={
              trade.side === "buy" ? "text-[#16e27b]" : "text-[#f6465d]"
            }
          >
            {trade.side.toUpperCase()}
          </span>
          <span>{formatPrice(trade.priceUsd)}</span>
          <span>{formatTokenAmount(trade.amountToken)}</span>
          <span className="truncate text-[#7d8b86]">
            {formatAddress(trade.trader)}
          </span>
          <span className="text-right text-[#7d8b86]">
            {formatTime(trade.time)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HoldersTable({
  error,
  holders,
}: {
  error: string | null;
  holders: Holder[];
}) {
  if (error) {
    return <EmptyState label="Holder data is unavailable." tone="red" />;
  }
  if (holders.length === 0) {
    return <EmptyState label="No holder rows returned for this token." />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[30rem] grid-cols-[3rem_1fr_1fr_5rem] border-white/10 border-b px-3 py-2 text-[#7d8b86] text-[11px] uppercase">
        <span>Rank</span>
        <span>Owner</span>
        <span>Amount</span>
        <span className="text-right">Share</span>
      </div>
      {holders.map((holder) => (
        <div
          className="grid min-w-[30rem] grid-cols-[3rem_1fr_1fr_5rem] border-white/5 border-b px-3 py-2 font-mono text-xs"
          key={`${holder.rank}-${holder.owner}`}
        >
          <span className="text-[#52605b]">#{holder.rank}</span>
          <span className="truncate">{formatAddress(holder.owner)}</span>
          <span>{formatTokenAmount(holder.amount)}</span>
          <span className="text-right text-[#16e27b]">
            {holder.percentage.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ActivityEmpty() {
  return <EmptyState label="Sign in and trade this token to build activity." />;
}

function AboutToken({ token }: { token: TokenDetail | null }) {
  if (!token) {
    return <EmptyState label="Token profile is unavailable." tone="red" />;
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <p className="text-[#dce5df]">
        {token.description ?? "No token description returned by the provider."}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="Market cap" value={formatUsd(token.marketCap)} />
        <Metric label="Volume" value={formatUsd(token.volume24h)} />
        <Metric label="Supply" value={formatTokenAmount(token.totalSupply)} />
        <Metric label="Holders" value={formatTokenAmount(token.holders)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {token.links.website ? (
          <a
            className="border border-white/10 px-3 py-2 text-[#16e27b]"
            href={token.links.website}
            rel="noopener noreferrer"
            target="_blank"
          >
            Website
          </a>
        ) : null}
        {token.links.twitter ? (
          <a
            className="border border-white/10 px-3 py-2 text-[#16e27b]"
            href={token.links.twitter}
            rel="noopener noreferrer"
            target="_blank"
          >
            X / Twitter
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-[#101617] p-2">
      <p className="text-[#7d8b86]">{label}</p>
      <p className="mt-1 truncate font-mono">{value}</p>
    </div>
  );
}

function EmptyState({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "red";
}) {
  return (
    <div
      className={cn(
        "m-3 border p-4 text-sm",
        tone === "red"
          ? "border-[#f6465d]/30 bg-[#f6465d]/5 text-[#ffb4bf]"
          : "border-white/10 bg-[#101617] text-[#7d8b86]"
      )}
    >
      {label}
    </div>
  );
}
