import { notFound } from "next/navigation";

import {
  type TokenSummary as BannerTokenSummary,
  TokenBanner,
} from "@/components/banners/token-banner";
import { client } from "@/utils/orpc";
import { MarketTabs } from "../_components/market-tabs";
import { PositionCard } from "../_components/position-card";
import {
  ChartPanel,
  FloatingAlert,
  MobileStats,
  MobileTokenHeader,
  TokenHeaderPanel,
  TradeTopBar,
  TrendingSidebar,
} from "../_components/server-panels";
import { MobileSwapBar, SwapPanel } from "../_components/swap-panel";
import type {
  Candle,
  Holder,
  Loadable,
  MarketErrorCode,
  TokenDetail,
  TokenSummary,
  Trade,
} from "../_components/types";

interface TradePageProps {
  params: Promise<{ address: string }>;
}

function errorCode(error: unknown): MarketErrorCode | "UNKNOWN" {
  if (typeof error !== "object" || error === null) {
    return "UNKNOWN";
  }

  const direct = "code" in error ? error.code : null;
  if (isMarketErrorCode(direct)) {
    return direct;
  }

  const data = "data" in error ? error.data : null;
  if (typeof data === "object" && data !== null && "code" in data) {
    const nested = data.code;
    if (isMarketErrorCode(nested)) {
      return nested;
    }
  }

  return "UNKNOWN";
}

function isMarketErrorCode(value: unknown): value is MarketErrorCode {
  return (
    value === "BAD_REQUEST" ||
    value === "NOT_FOUND" ||
    value === "RATE_LIMITED" ||
    value === "UPSTREAM_ERROR"
  );
}

async function load<T>(promise: Promise<T>): Promise<Loadable<T>> {
  try {
    return { data: await promise, error: null };
  } catch (error) {
    return { data: null, error: errorCode(error) };
  }
}

export default async function TradePage({ params }: TradePageProps) {
  const { address } = await params;

  const trendingPromise = load(
    client.tokens.trending({ limit: 30, sort: "trending" })
  );
  const tokenPromise = load(client.tokens.get({ address }));
  const chartPromise = load(client.chart.candles({ address, interval: "15m" }));
  const holdersPromise = load(client.holders.list({ address, limit: 20 }));
  const tradesPromise = load(client.trades.recent({ address, limit: 30 }));

  const [trending, tokenResult, chart, holders, trades] = await Promise.all([
    trendingPromise,
    tokenPromise,
    chartPromise,
    holdersPromise,
    tradesPromise,
  ]);

  if (
    tokenResult.error === "BAD_REQUEST" ||
    tokenResult.error === "NOT_FOUND"
  ) {
    notFound();
  }

  const token: TokenDetail | null = tokenResult.data;
  const bannerTokens = (trending.data?.items ?? []) as BannerTokenSummary[];
  const candles: Candle[] = chart.data?.candles ?? [];
  const holderRows: Holder[] = holders.data?.items ?? [];
  const tradeRows: Trade[] = trades.data?.items ?? [];
  const chartError = chart.error;
  const holdersError = holders.error;
  const tradesError = trades.error;

  return (
    <main className="dark min-h-svh bg-[#0b0f10] text-[#f2fff7]">
      <div className="hidden lg:block">
        <TokenBanner tokens={bannerTokens} />
      </div>
      <TradeTopBar />
      <MobileTokenHeader token={token} />
      <FloatingAlert />
      <div className="grid lg:h-[calc(100svh-137px)] lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <TrendingSidebar
          activeAddress={address}
          result={
            trending as Loadable<{
              items: TokenSummary[];
              nextCursor: string | null;
            }>
          }
        />
        <section className="min-w-0 overflow-y-auto pb-40 lg:pb-0">
          <div className="hidden lg:block">
            <TokenHeaderPanel token={token} />
          </div>
          <ChartPanel candles={candles} error={chartError} />
          <MobileStats token={token} />
          <div className="hidden lg:block">
            <MarketTabs
              address={address}
              holders={holderRows}
              holdersError={holdersError}
              initialTrades={tradeRows}
              initialTradesError={tradesError}
              token={token}
              variant="desktop"
            />
          </div>
          <div className="lg:hidden">
            <MarketTabs
              address={address}
              holders={holderRows}
              holdersError={holdersError}
              initialTrades={tradeRows}
              initialTradesError={tradesError}
              token={token}
              variant="mobile"
            />
          </div>
          <div className="lg:hidden">
            <PositionCard address={address} />
            <div id="swap-panel">
              <SwapPanel token={token} />
            </div>
          </div>
        </section>
        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-white/10 border-l bg-[#080c0d] p-3 lg:flex">
          <SwapPanel token={token} />
          <PositionCard address={address} />
        </aside>
      </div>
      <div className="hidden lg:block">
        <TokenBanner reverse tokens={bannerTokens} />
      </div>
      <MobileSwapBar token={token} />
    </main>
  );
}
