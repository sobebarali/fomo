import { notFound } from "next/navigation";

import { client } from "@/utils/orpc";
import { MarketTabs } from "../_components/market-tabs";
import { PositionCard } from "../_components/position-card";
import { ChartPanel } from "../_components/server-panels";
import { MobileSwapBar, SwapPanel } from "../_components/swap-panel";
import {
  LiveMobileStats,
  LiveMobileTokenHeader,
  LiveTokenHeaderPanel,
} from "../_components/token-live";
import type {
  Loadable,
  MarketErrorCode,
  TokenDetail,
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

  // Block only on the token header — the heaviest, above-the-fold read. Chart / holders / trades
  // stream in their own client islands, so switching tokens never waits on four BirdEye calls.
  const tokenResult = await load(client.tokens.get({ address }));

  if (
    tokenResult.error === "BAD_REQUEST" ||
    tokenResult.error === "NOT_FOUND"
  ) {
    notFound();
  }

  const token: TokenDetail | null = tokenResult.data;

  // Only the per-token content — `section` (col 2) + `aside` (col 3) are direct grid items of the
  // layout's 3-column grid; the mobile-only header/swap-bar are `lg:hidden` so they take no desktop
  // grid cell. The header seeds from the server token and goes live via SSE (`token:<address>`).
  return (
    <>
      <LiveMobileTokenHeader address={address} initialToken={token} />
      <section className="min-w-0 overflow-y-auto pb-40 lg:pb-0">
        <div className="hidden lg:block">
          <LiveTokenHeaderPanel address={address} initialToken={token} />
        </div>
        <ChartPanel address={address} />
        <LiveMobileStats address={address} initialToken={token} />
        <div className="hidden lg:block">
          <MarketTabs address={address} token={token} variant="desktop" />
        </div>
        <div className="lg:hidden">
          <MarketTabs address={address} token={token} variant="mobile" />
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
