import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { birdeye } from "../../integrations/birdeye";
import type {
  TokenDetail,
  TokenSummary,
} from "../../integrations/birdeye/schema";
import { testContext } from "../../test-support/context";
import { encodeCursor } from "../_shared/pagination";
import { appRouter } from "../index";

// Mock only the external edge: keep the real error classes (so the router's `instanceof` maps fire)
// and the view types, but make `trending`/`token` controllable vi.fns. The router imports the
// `birdeye` singleton directly (no context seam), so the module is the seam.
vi.mock("../../integrations/birdeye", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/birdeye")>();
  return {
    ...actual,
    birdeye: { ...actual.birdeye, token: vi.fn(), trending: vi.fn() },
  };
});

const mockTrending = vi.mocked(birdeye.trending);
const mockToken = vi.mocked(birdeye.token);

// A real, well-formed mint — passes the SolanaMint regex so we exercise the upstream path, not BAD_REQUEST.
const MINT = "So11111111111111111111111111111111111111112";

const summary = (address: string): TokenSummary => ({
  address,
  symbol: "CHAD",
  name: "Chad Coin",
  logoUri: null,
  priceUsd: 1.5,
  change24h: 12.3,
  volume24h: 1000,
  marketCap: 50_000,
});

const detail = (links: TokenDetail["links"] = {}): TokenDetail => ({
  ...summary(MINT),
  liquidity: 9000,
  holders: 1234,
  totalSupply: 1_000_000,
  description: null,
  links,
});

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  // tokens never touches the DB, but the harness builds a Context with a real PGlite db for parity.
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

it("returns trending items and applies input defaults (limit 20, sort trending, offset 0)", async () => {
  mockTrending.mockResolvedValue([summary("A"), summary("B")]);

  const result = await call(
    appRouter.tokens.trending,
    {},
    { context: testContext(db) }
  );

  expect(mockTrending).toHaveBeenCalledWith({
    sort: "trending",
    limit: 20,
    offset: 0,
  });
  expect(result.items).toHaveLength(2);
  expect(result.items[0]).toMatchObject({ address: "A", symbol: "CHAD" });
});

it("pages stably: full page yields a cursor, the next page advances the offset, the last page nulls the cursor", async () => {
  const data = ["t0", "t1", "t2", "t3", "t4"].map(summary);
  mockTrending.mockImplementation(({ offset, limit }) =>
    Promise.resolve(data.slice(offset, offset + limit))
  );

  const page1 = await call(
    appRouter.tokens.trending,
    { limit: 2 },
    { context: testContext(db) }
  );
  expect(page1.items.map((t) => t.address)).toEqual(["t0", "t1"]);
  expect(page1.nextCursor).toBe(encodeCursor(2));

  const page2 = await call(
    appRouter.tokens.trending,
    { limit: 2, cursor: page1.nextCursor ?? undefined },
    { context: testContext(db) }
  );
  expect(mockTrending).toHaveBeenLastCalledWith({
    sort: "trending",
    limit: 2,
    offset: 2,
  });
  expect(page2.items.map((t) => t.address)).toEqual(["t2", "t3"]);

  const page3 = await call(
    appRouter.tokens.trending,
    { limit: 2, cursor: page2.nextCursor ?? undefined },
    { context: testContext(db) }
  );
  expect(page3.items.map((t) => t.address)).toEqual(["t4"]);
  expect(page3.nextCursor).toBeNull();
});

it("treats a malformed cursor as offset 0 rather than erroring", async () => {
  mockTrending.mockResolvedValue([]);

  const result = await call(
    appRouter.tokens.trending,
    { cursor: "!!!not-a-cursor!!!" },
    { context: testContext(db) }
  );

  expect(result.nextCursor).toBeNull();
  expect(mockTrending).toHaveBeenCalledWith({
    sort: "trending",
    limit: 20,
    offset: 0,
  });
});

it("maps a BirdEye 429 to RATE_LIMITED on trending", async () => {
  mockTrending.mockRejectedValue(new RateLimitError());

  await expect(
    call(appRouter.tokens.trending, {}, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps a malformed BirdEye payload to UPSTREAM_ERROR on trending", async () => {
  mockTrending.mockRejectedValue(new UpstreamError("bad envelope"));

  await expect(
    call(appRouter.tokens.trending, {}, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});

it("returns a token detail with empty links", async () => {
  mockToken.mockResolvedValue(detail());

  const result = await call(
    appRouter.tokens.get,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(result).toMatchObject({
    address: MINT,
    holders: 1234,
    liquidity: 9000,
    links: {},
  });
});

it("returns a token detail with populated links", async () => {
  mockToken.mockResolvedValue(
    detail({ website: "https://chad.fun", twitter: "https://x.com/chad" })
  );

  const result = await call(
    appRouter.tokens.get,
    { address: MINT },
    { context: testContext(db) }
  );

  expect(result.links).toEqual({
    website: "https://chad.fun",
    twitter: "https://x.com/chad",
  });
});

it("rejects an invalid mint with BAD_REQUEST before any upstream call", async () => {
  mockToken.mockResolvedValue(null);

  await expect(
    call(
      appRouter.tokens.get,
      { address: "not-a-real-mint" },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(mockToken).not.toHaveBeenCalled();
});

it("maps an unknown mint (null) to NOT_FOUND", async () => {
  mockToken.mockResolvedValue(null);

  await expect(
    call(appRouter.tokens.get, { address: MINT }, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("maps a BirdEye 429 to RATE_LIMITED on get", async () => {
  mockToken.mockRejectedValue(new RateLimitError());

  await expect(
    call(appRouter.tokens.get, { address: MINT }, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps a malformed BirdEye payload to UPSTREAM_ERROR on get", async () => {
  mockToken.mockRejectedValue(new UpstreamError("bad envelope"));

  await expect(
    call(appRouter.tokens.get, { address: MINT }, { context: testContext(db) })
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});
