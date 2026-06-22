import { notFound } from "next/navigation";

import { client } from "@/utils/orpc";
import { MarketTabs } from "../_components/market-tabs";
import { PositionCard } from "../_components/position-card";
import { RateLimitRefresher } from "../_components/rate-limit-refresher";
import {
  ChartPanel,
  MobileStats,
  MobileTokenHeader,
  TokenHeaderPanel,
} from "../_components/server-panels";
import { MobileSwapBar, SwapPanel } from "../_components/swap-panel";
import type {
  Candle,
  Holder,
  Loadable,
  MarketErrorCode,
  TokenDetail,
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

  const tokenPromise = load(client.tokens.get({ address }));
  const chartPromise = load(client.chart.candles({ address, interval: "15m" }));
  const holdersPromise = load(client.holders.list({ address, limit: 20 }));
  const tradesPromise = load(client.trades.recent({ address, limit: 30 }));

  const [tokenResult, chart, holders, trades] = await Promise.all([
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
  const candles: Candle[] = chart.data?.candles ?? [];
  const holderRows: Holder[] = holders.data?.items ?? [];
  const tradeRows: Trade[] = trades.data?.items ?? [];
  const chartError = chart.error;
  const holdersError = holders.error;
  // Any rate-limited panel → poll the server until it clears (the client islands self-retry; the
  // purely server-rendered panels need this nudge).
  const rateLimited = [
    tokenResult.error,
    chart.error,
    holders.error,
    trades.error,
  ].includes("RATE_LIMITED");

  // Only the per-token content — `section` (col 2) + `aside` (col 3) are direct grid items of the
  // layout's 3-column grid; the mobile-only header/swap-bar are `lg:hidden` so they take no desktop
  // grid cell. The persistent chrome (banners, top bar, trending sidebar) lives in `layout.tsx`, so
  // switching tokens re-renders just these slots, not the whole app.
  return (
    <>
      <MobileTokenHeader token={token} />
      {rateLimited ? <RateLimitRefresher /> : null}
      <section className="min-w-0 overflow-y-auto pb-40 lg:pb-0">
        <div className="hidden lg:block">
          <TokenHeaderPanel token={token} />
        </div>
        <ChartPanel address={address} candles={candles} error={chartError} />
        <MobileStats token={token} />
        <div className="hidden lg:block">
          <MarketTabs
            address={address}
            holders={holderRows}
            holdersError={holdersError}
            initialTrades={tradeRows}
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
      <MobileSwapBar token={token} />
    </>
  );
}
