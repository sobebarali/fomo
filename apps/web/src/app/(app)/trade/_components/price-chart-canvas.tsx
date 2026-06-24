"use client";

import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { Candle } from "./types";

const LINE_COLOR = "#16e27b";

export function AreaCanvas({ points }: { points: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const chart = createChart(el, {
      autoSize: true,
      crosshair: {
        horzLine: { labelVisible: false, visible: false },
        vertLine: { labelVisible: false },
      },
      grid: {
        horzLines: { visible: false },
        vertLines: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
      layout: {
        attributionLogo: false,
        background: { color: "#0b0f10" },
        textColor: "#7d8b86",
      },
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: false },
      timeScale: { borderVisible: false, visible: false },
    });
    const series = chart.addSeries(AreaSeries, {
      bottomColor: "rgba(22, 226, 123, 0)",
      lastValueVisible: false,
      lineColor: LINE_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      topColor: "rgba(22, 226, 123, 0.2)",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!(chart && series)) {
      return;
    }
    series.setData(
      points.map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: candle.close,
      }))
    );
    chart.timeScale().fitContent();
  }, [points]);

  return <div className="h-[18rem] w-full" ref={containerRef} />;
}
