import { Button } from "@fomo/ui/components/button";
import { cn } from "@fomo/ui/lib/utils";
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  Search,
  Share2,
  Star,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import {
  errorCopy,
  formatAddress,
  formatChange,
  formatCompact,
  formatPrice,
  formatUsd,
} from "./format";
import { TokenLogo } from "./token-logo";
import type { Candle, Loadable, TokenDetail, TokenSummary } from "./types";

const RANGE_TABS = ["1H", "1D", "1W", "1M", "ALL"] as const;

export function TradeTopBar() {
  return (
    <header className="hidden h-14 items-center justify-between border-white/10 border-b bg-[#0b0f10] px-4 text-xs lg:flex">
      <Link className="flex items-center gap-2 font-semibold" href="/">
        <span className="flex size-8 items-center justify-center bg-[#16e27b]">
          <span className="font-black text-[#07100b]">C</span>
        </span>
        ChadWallet
      </Link>
      <div className="flex h-8 w-[34rem] items-center gap-2 border border-white/10 bg-[#101617] px-3 text-[#7d8b86]">
        <Search data-icon="inline-start" />
        <span>Search token, symbol, or mint</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-8 items-center gap-2 border border-white/10 bg-[#101617] px-3 text-[#dce5df]">
          <Wallet data-icon="inline-start" />
          <span>$0.00</span>
          <ChevronDown data-icon="inline-end" />
        </div>
        <AuthButton />
      </div>
    </header>
  );
}

export function MobileTokenHeader({ token }: { token: TokenDetail | null }) {
  const isUp = (token?.change24h ?? 0) >= 0;
  return (
    <header className="sticky top-0 z-20 border-white/10 border-b bg-[#0b0f10]/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        <Link
          className="inline-flex size-7 items-center justify-center text-[#dce5df] transition-colors hover:bg-white/10"
          href="/"
        >
          <ArrowLeft />
          <span className="sr-only">Back</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost">
            <Share2 />
            <span className="sr-only">Share</span>
          </Button>
          <Button size="icon-sm" variant="ghost">
            <Star />
            <span className="sr-only">Watch</span>
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TokenLogo
            logoUri={token?.logoUri ?? null}
            size={36}
            symbol={token?.symbol ?? "?"}
          />
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-base">
              {token?.symbol ?? "Token"}
            </h1>
            <p className="truncate text-[#7d8b86] text-xs">
              {token ? formatAddress(token.address) : "Market unavailable"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg">
            {token ? formatPrice(token.priceUsd) : "-"}
          </p>
          <p
            className={cn(
              "text-xs",
              isUp ? "text-[#16e27b]" : "text-[#f6465d]"
            )}
          >
            {token ? formatChange(token.change24h) : "-"}
          </p>
        </div>
      </div>
    </header>
  );
}

export function TrendingSidebar({
  activeAddress,
  result,
}: {
  activeAddress: string;
  result: Loadable<{ items: TokenSummary[]; nextCursor: string | null }>;
}) {
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
        {result.data ? (
          <div className="flex flex-col">
            {result.data.items.map((token, index) => (
              <Link
                className={cn(
                  "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 border-white/5 border-b px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.04]",
                  token.address === activeAddress &&
                    "bg-[#16e27b]/10 ring-1 ring-[#16e27b]/60 ring-inset"
                )}
                href={`/trade/${token.address}`}
                key={token.address}
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

export function TokenHeaderPanel({ token }: { token: TokenDetail | null }) {
  if (!token) {
    return <ErrorBlock code="UPSTREAM_ERROR" title="Token data unavailable" />;
  }

  const stats = [
    ["Market cap", formatUsd(token.marketCap)],
    ["Volume", formatUsd(token.volume24h)],
    ["Liquidity", formatUsd(token.liquidity)],
    ["Holders", formatCompact(token.holders)],
  ] as const;

  return (
    <section className="border-white/10 border-b bg-[#0b0f10] p-3 lg:p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <TokenLogo logoUri={token.logoUri} size={44} symbol={token.symbol} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-xl">{token.symbol}</h1>
              <span className="max-w-48 truncate text-[#7d8b86] text-sm">
                {token.name}
              </span>
            </div>
            <p className="mt-1 break-all font-mono text-[#52605b] text-[11px]">
              {token.address}
            </p>
          </div>
        </div>
        <div className="md:text-right">
          <p className="font-semibold text-2xl">
            {formatPrice(token.priceUsd)}
          </p>
          <p
            className={cn(
              "font-medium text-sm",
              token.change24h >= 0 ? "text-[#16e27b]" : "text-[#f6465d]"
            )}
          >
            {formatChange(token.change24h)} 24H
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 border-white/10 border-t md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div
            className="border-white/10 border-r py-3 last:border-r-0"
            key={label}
          >
            <p className="text-[#7d8b86] text-[11px] uppercase">{label}</p>
            <p className="mt-1 font-mono text-sm">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChartPanel({
  candles,
  error,
}: {
  candles: Candle[];
  error: string | null;
}) {
  return (
    <section className="border-white/10 border-b bg-[#0b0f10] p-3 lg:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm">Chart</h2>
          <p className="text-[#7d8b86] text-xs">Live BirdEye candles</p>
        </div>
        <div className="flex items-center border border-white/10 bg-[#101617] p-0.5">
          {RANGE_TABS.map((range) => (
            <span
              className={cn(
                "px-2 py-1 font-mono text-[11px]",
                range === "1D"
                  ? "bg-[#16e27b] text-[#07100b]"
                  : "text-[#7d8b86]"
              )}
              key={range}
            >
              {range}
            </span>
          ))}
        </div>
      </div>
      {error ? (
        <ErrorBlock code={error} compact title="Chart unavailable" />
      ) : (
        <CandleSvg candles={candles} />
      )}
    </section>
  );
}

function CandleSvg({ candles }: { candles: Candle[] }) {
  const visible = candles.slice(-64);
  if (visible.length === 0) {
    return <EmptyPanel label="No candles returned for this token." />;
  }

  const high = Math.max(...visible.map((candle) => candle.high));
  const low = Math.min(...visible.map((candle) => candle.low));
  const range = high - low || 1;
  const width = 720;
  const height = 280;
  const padding = 18;
  const plotHeight = height - padding * 2;
  const step = width / visible.length;
  const candleWidth = Math.max(3, Math.min(8, step * 0.46));
  const y = (value: number) => padding + ((high - value) / range) * plotHeight;
  const linePath = visible
    .map((candle, index) => {
      const x = index * step + step / 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y(candle.close).toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="h-[18rem] overflow-hidden border border-white/10 bg-[#080c0d]">
      <svg
        aria-label="Token OHLC chart"
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="trade-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#16e27b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#16e27b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
            x1="0"
            x2={width}
            y1={padding + (plotHeight / 3) * line}
            y2={padding + (plotHeight / 3) * line}
          />
        ))}
        <path
          d={`${linePath} L${width} ${height} L0 ${height} Z`}
          fill="url(#trade-chart-fill)"
        />
        <path d={linePath} fill="none" stroke="#16e27b" strokeWidth="2" />
        {visible.map((candle, index) => {
          const x = index * step + step / 2;
          const openY = y(candle.open);
          const closeY = y(candle.close);
          const isUp = candle.close >= candle.open;
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(1, Math.abs(openY - closeY));
          return (
            <g key={`${candle.time}-${index}`}>
              <line
                stroke={isUp ? "#16e27b" : "#f6465d"}
                strokeWidth="1"
                x1={x}
                x2={x}
                y1={y(candle.high)}
                y2={y(candle.low)}
              />
              <rect
                fill={isUp ? "#16e27b" : "#f6465d"}
                height={bodyHeight}
                width={candleWidth}
                x={x - candleWidth / 2}
                y={bodyTop}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MobileStats({ token }: { token: TokenDetail | null }) {
  const stats = token
    ? [
        ["MC", formatUsd(token.marketCap)],
        ["Vol", formatUsd(token.volume24h)],
        ["Liq", formatUsd(token.liquidity)],
        ["Holders", formatCompact(token.holders)],
      ]
    : [
        ["MC", "-"],
        ["Vol", "-"],
        ["Liq", "-"],
        ["Holders", "-"],
      ];

  return (
    <div className="grid grid-cols-4 border-white/10 border-y bg-[#0b0f10] lg:hidden">
      {stats.map(([label, value]) => (
        <div
          className="border-white/10 border-r p-2 last:border-r-0"
          key={label}
        >
          <p className="text-[#7d8b86] text-[10px]">{label}</p>
          <p className="mt-1 truncate font-mono text-xs">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function ErrorBlock({
  code,
  compact = false,
  title,
}: {
  code: string | null;
  compact?: boolean;
  title: string;
}) {
  return (
    <div
      className={cn(
        "border border-[#f6465d]/30 bg-[#f6465d]/5 text-[#ffb4bf]",
        compact ? "p-3 text-xs" : "p-5 text-sm"
      )}
    >
      <p className="font-medium text-[#f6465d]">{title}</p>
      <p className="mt-1 text-[#ffb4bf]/80">{errorCopy(code)}</p>
    </div>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="border border-white/10 bg-[#101617] p-4 text-[#7d8b86] text-sm">
      {label}
    </div>
  );
}

export function FloatingAlert() {
  return (
    <div className="hidden items-center gap-2 border-white/10 border-b bg-[#101617] px-4 py-2 text-[#7d8b86] text-xs lg:flex">
      <Bell data-icon="inline-start" />
      Public market reads are server-rendered. Wallet actions stay in Privy.
    </div>
  );
}
