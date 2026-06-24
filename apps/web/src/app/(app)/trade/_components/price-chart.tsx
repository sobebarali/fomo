"use client";

import { cn } from "@fomo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { client } from "@/utils/orpc";
import { errorCopy } from "./format";
import type { Candle } from "./types";

type Range = "LIVE" | "1D" | "1W" | "1M" | "1Y" | "MAX";
type Interval = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W";

const RANGE_TABS: Range[] = ["LIVE", "1D", "1W", "1M", "1Y", "MAX"];
const DEFAULT_RANGE: Range = "1D";
const AreaCanvas = dynamic(
  () => import("./price-chart-canvas").then((mod) => mod.AreaCanvas),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

const RANGE_CONFIG: Record<
  Range,
  { interval: Interval; lookbackSeconds?: number; pollMs?: number }
> = {
  // Only LIVE polls; the other ranges are historical and refresh on navigation/range change.
  LIVE: { interval: "1m", lookbackSeconds: 10_800, pollMs: 30_000 },
  "1D": { interval: "15m" },
  "1W": { interval: "1H", lookbackSeconds: 604_800 },
  "1M": { interval: "4H", lookbackSeconds: 2_592_000 },
  "1Y": { interval: "1D", lookbackSeconds: 31_536_000 },
  MAX: { interval: "1W" },
};
const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14_400,
  "1D": 86_400,
  "1W": 604_800,
};

function queryErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "UPSTREAM_ERROR";
}

export function PriceChart({ address }: { address: string }) {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const config = RANGE_CONFIG[range];
  const query = useQuery({
    enabled: ready,
    queryFn: () => {
      const intervalSeconds = INTERVAL_SECONDS[config.interval];
      const to =
        Math.floor(Date.now() / 1000 / intervalSeconds) * intervalSeconds;
      return client.chart.candles({
        address,
        from: config.lookbackSeconds ? to - config.lookbackSeconds : undefined,
        interval: config.interval,
        to,
      });
    },
    queryKey: ["chart-candles", address, range],
    refetchInterval: ready && config.pollMs ? config.pollMs : false,
  });

  const points = query.data?.candles ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm">Chart</h2>
          <p className="text-[#7d8b86] text-xs">Live BirdEye prices</p>
        </div>
        <div className="flex items-center gap-1">
          {RANGE_TABS.map((tab) => (
            <button
              className={cn(
                "px-2 py-1 font-medium text-[11px]",
                tab === range
                  ? "bg-[#16e27b] text-[#0a0a0a]"
                  : "bg-[#1e2427] text-[#9aa0a6]"
              )}
              key={tab}
              onClick={() => setRange(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {ready ? (
        renderChartArea({
          points,
          isError: query.isError,
          isLoading: query.isLoading,
          query,
        })
      ) : (
        <ChartSkeleton />
      )}
    </div>
  );
}

function renderChartArea({
  points,
  isError,
  isLoading,
  query,
}: {
  points: Candle[];
  isError: boolean;
  isLoading: boolean;
  query: { error: unknown };
}) {
  if (points.length > 0) {
    return <AreaCanvas points={points} />;
  }
  if (isError) {
    return <ChartPlaceholder code={queryErrorCode(query.error)} tone="error" />;
  }
  if (isLoading) {
    return <ChartSkeleton />;
  }
  return <ChartPlaceholder code={null} tone="empty" />;
}

function ChartSkeleton() {
  return <div className="h-[18rem] w-full animate-pulse bg-[#101617]" />;
}

function ChartPlaceholder({
  code,
  tone,
}: {
  code: string | null;
  tone: "error" | "empty";
}) {
  return (
    <div
      className={cn(
        "flex h-[18rem] items-center justify-center border p-4 text-center text-sm",
        tone === "error"
          ? "border-[#f6465d]/30 bg-[#f6465d]/5 text-[#ffb4bf]"
          : "border-white/10 bg-[#101617] text-[#7d8b86]"
      )}
    >
      {tone === "error"
        ? errorCopy(code)
        : "No price history returned for this token."}
    </div>
  );
}
