import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import type { Trade } from "../../schemas/token";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

// Mock only the external edge: keep the real error classes (so the router's `instanceof` maps fire)
// and the view types, but make `trades` a controllable vi.fn. The router imports the `market`
// singleton directly (no context seam), so the module is the seam.
vi.mock("../../integrations/market", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/market")>();
  return {
    ...actual,
    market: { ...actual.market, trades: vi.fn() },
  };
});

const mockTrades = vi.mocked(market.trades);

// A real, well-formed mint — passes the SolanaMint regex so we exercise the upstream path, not BAD_REQUEST.
const MINT = "So11111111111111111111111111111111111111112";

const trade = (overrides: Partial<Trade> = {}): Trade => ({
  txHash: "5xH...abc",
  blockUnixTime: 1_782_126_032,
  side: "buy",
  owner: "5EmC...xyz",
  priceUsd: 0.000_004_621,
  amount: 21_394.645_22,
  ...overrides,
});

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  // trades never touches the DB, but the harness builds a Context with a real PGlite db for parity.
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

it("returns trades remapped to the contract shape, newest-first, with derived amountUsd", async () => {
  const newer = trade({ txHash: "tx-newer", blockUnixTime: 200 });
  const older = trade({
    txHash: "tx-older",
    blockUnixTime: 100,
    side: "sell",
    owner: "trader-2",
    priceUsd: 2,
    amount: 5,
  });
  mockTrades.mockResolvedValue([newer, older]);

  const result = await call(
    appRouter.trades.recent,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(result.items).toHaveLength(2);
  // Order preserved (newest-first as the integration delivers it).
  expect(result.items.map((t) => t.txHash)).toEqual(["tx-newer", "tx-older"]);
  // Full remap of the first row.
  expect(result.items[0]).toEqual({
    txHash: "tx-newer",
    side: "buy",
    priceUsd: 0.000_004_621,
    amountToken: 21_394.645_22,
    amountUsd: 21_394.645_22 * 0.000_004_621,
    trader: "5EmC...xyz",
    time: 200,
  });
  // Field remap + derived amountUsd on the second row.
  expect(result.items[1]).toMatchObject({
    side: "sell",
    trader: "trader-2",
    time: 100,
    amountToken: 5,
    amountUsd: 10,
  });
});

it("applies the default limit (30) when none is given", async () => {
  mockTrades.mockResolvedValue([]);

  await call(
    appRouter.trades.recent,
    { address: MINT },
    {
      context: testContext(db),
    }
  );

  expect(mockTrades).toHaveBeenCalledWith({ address: MINT, limit: 30 });
});

it("passes an explicit (bounded) limit through to BirdEye", async () => {
  mockTrades.mockResolvedValue([]);

  await call(
    appRouter.trades.recent,
    { address: MINT, limit: 50 },
    {
      context: testContext(db),
    }
  );

  expect(mockTrades).toHaveBeenCalledWith({ address: MINT, limit: 50 });
});

it("rejects an invalid mint with BAD_REQUEST before any upstream call", async () => {
  mockTrades.mockResolvedValue([]);

  await expect(
    call(
      appRouter.trades.recent,
      { address: "not-a-real-mint" },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(mockTrades).not.toHaveBeenCalled();
});

it("maps a BirdEye 429 to RATE_LIMITED", async () => {
  mockTrades.mockRejectedValue(new RateLimitError());

  await expect(
    call(
      appRouter.trades.recent,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps a malformed BirdEye payload to UPSTREAM_ERROR", async () => {
  mockTrades.mockRejectedValue(new UpstreamError("bad envelope"));

  await expect(
    call(
      appRouter.trades.recent,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});
