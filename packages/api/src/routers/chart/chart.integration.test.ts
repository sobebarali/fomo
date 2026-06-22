import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { birdeye } from "../../integrations/birdeye";
import type { Candle } from "../../integrations/birdeye/schema";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

// Mock only the external edge: keep the real error classes (so the router's `instanceof` maps fire)
// and the view types, but make `ohlcv` a controllable vi.fn. The router imports the `birdeye`
// singleton directly (no context seam), so the module is the seam.
vi.mock("../../integrations/birdeye", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/birdeye")>();
  return {
    ...actual,
    birdeye: { ...actual.birdeye, ohlcv: vi.fn() },
  };
});

const mockOhlcv = vi.mocked(birdeye.ohlcv);

// A real, well-formed mint — passes the SolanaMint regex so we exercise the upstream path, not BAD_REQUEST.
const MINT = "So11111111111111111111111111111111111111112";

const candle = (time: number): Candle => ({
  time,
  open: 1,
  high: 2,
  low: 0.5,
  close: 1.5,
  volume: 100,
});

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  // chart never touches the DB, but the harness builds a Context with a real PGlite db for parity.
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

it("returns candles sorted ascending by time", async () => {
  mockOhlcv.mockResolvedValue([candle(300), candle(100), candle(200)]);

  const result = await call(
    appRouter.chart.candles,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(result.candles.map((c) => c.time)).toEqual([100, 200, 300]);
  expect(result.candles[0]).toMatchObject({ open: 1, close: 1.5, volume: 100 });
});

it("applies the interval default (15m) and a sane from<to range when omitted", async () => {
  mockOhlcv.mockResolvedValue([candle(100)]);

  await call(
    appRouter.chart.candles,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(mockOhlcv).toHaveBeenCalledWith(
    expect.objectContaining({ address: MINT, interval: "15m" })
  );
  const arg = mockOhlcv.mock.calls.at(-1)?.[0];
  expect(arg?.from).toBeLessThan(arg?.to ?? 0);
});

it("rejects from > to with BAD_REQUEST before any upstream call", async () => {
  mockOhlcv.mockResolvedValue([candle(100)]);

  await expect(
    call(
      appRouter.chart.candles,
      { address: MINT, from: 200, to: 100 },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(mockOhlcv).not.toHaveBeenCalled();
});

it("rejects an invalid mint with BAD_REQUEST before any upstream call", async () => {
  mockOhlcv.mockResolvedValue([candle(100)]);

  await expect(
    call(
      appRouter.chart.candles,
      { address: "not-a-real-mint" },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(mockOhlcv).not.toHaveBeenCalled();
});

it("maps an empty series to NOT_FOUND", async () => {
  mockOhlcv.mockResolvedValue([]);

  await expect(
    call(
      appRouter.chart.candles,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("maps a BirdEye 429 to RATE_LIMITED", async () => {
  mockOhlcv.mockRejectedValue(new RateLimitError());

  await expect(
    call(
      appRouter.chart.candles,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps a malformed BirdEye payload to UPSTREAM_ERROR", async () => {
  mockOhlcv.mockRejectedValue(new UpstreamError("bad envelope"));

  await expect(
    call(
      appRouter.chart.candles,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});
