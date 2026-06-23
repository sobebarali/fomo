import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { market } from "../../integrations/market";
import type { Holder, TokenDetail } from "../../schemas/token";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

// Mock only the external edge: keep the real error classes (so the router's `instanceof` maps fire)
// and the view types, but make `holders`/`token` controllable vi.fns. The router imports the
// `market` singleton directly (no context seam), so the module is the seam.
vi.mock("../../integrations/market", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/market")>();
  return {
    ...actual,
    market: { ...actual.market, holders: vi.fn(), token: vi.fn() },
  };
});

const mockHolders = vi.mocked(market.holders);
const mockToken = vi.mocked(market.token);

// A real, well-formed mint — passes the SolanaMint regex so we exercise the upstream path, not BAD_REQUEST.
const MINT = "So11111111111111111111111111111111111111112";

const holder = (address: string, amount: number): Holder => ({
  address,
  amount,
});

// Minimal TokenDetail — only totalSupply matters for the percentage math.
const detail = (totalSupply: number): TokenDetail => ({
  address: MINT,
  symbol: "CHAD",
  name: "Chad Coin",
  logoUri: null,
  priceUsd: 1.5,
  change24h: 12.3,
  volume24h: 1000,
  marketCap: 50_000,
  liquidity: 9000,
  holders: 1234,
  totalSupply,
  description: null,
  links: {},
});

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  // holders never touches the DB, but the harness builds a Context with a real PGlite db for parity.
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

it("sorts holders descending by amount, assigns 1-based rank, and applies the default limit", async () => {
  // Fed out of order to prove the router re-sorts.
  mockHolders.mockResolvedValue([
    holder("B", 30),
    holder("A", 50),
    holder("C", 20),
  ]);
  mockToken.mockResolvedValue(detail(1000));

  const result = await call(
    appRouter.holders.list,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(mockHolders).toHaveBeenCalledWith({ address: MINT, limit: 20 });
  expect(result.items.map((h) => h.owner)).toEqual(["A", "B", "C"]);
  expect(result.items.map((h) => h.rank)).toEqual([1, 2, 3]);
});

it("computes percentage from total supply rounded to 2 decimals, summing sanely under 100%", async () => {
  mockHolders.mockResolvedValue([holder("A", 50_000), holder("B", 4210)]);
  mockToken.mockResolvedValue(detail(1_000_000));

  const result = await call(
    appRouter.holders.list,
    { address: MINT, limit: 2 },
    { context: testContext(db) }
  );

  expect(result.items[0]).toMatchObject({ owner: "A", percentage: 5 });
  expect(result.items[1]).toMatchObject({ owner: "B", percentage: 0.42 });
  const total = result.items.reduce((sum, h) => sum + h.percentage, 0);
  expect(total).toBeLessThanOrEqual(100);
});

it("yields 0 percentage when supply is unknown (token null) without throwing NOT_FOUND", async () => {
  mockHolders.mockResolvedValue([holder("A", 50), holder("B", 30)]);
  mockToken.mockResolvedValue(null);

  const result = await call(
    appRouter.holders.list,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(result.items.every((h) => h.percentage === 0)).toBe(true);
  expect(result.items.map((h) => h.rank)).toEqual([1, 2]);
});

it("maps a BirdEye 429 to RATE_LIMITED", async () => {
  mockHolders.mockRejectedValue(new RateLimitError());
  mockToken.mockResolvedValue(detail(1000));

  await expect(
    call(
      appRouter.holders.list,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps a malformed BirdEye payload to UPSTREAM_ERROR", async () => {
  mockHolders.mockRejectedValue(new UpstreamError("bad envelope"));
  mockToken.mockResolvedValue(detail(1000));

  await expect(
    call(
      appRouter.holders.list,
      { address: MINT },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});

it("rejects an invalid mint with BAD_REQUEST before any upstream call", async () => {
  await expect(
    call(
      appRouter.holders.list,
      { address: "not-a-real-mint" },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(mockHolders).not.toHaveBeenCalled();
});
