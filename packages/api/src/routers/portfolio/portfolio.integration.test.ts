import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { alchemy } from "../../integrations/alchemy";
import type { TokenBalance } from "../../integrations/alchemy/schema";
import { market } from "../../integrations/market";
import type { AuthSession } from "../../integrations/privy/schema";
import type { TokenDetail } from "../../schemas/token";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

vi.mock("../../integrations/alchemy", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/alchemy")>();
  return {
    ...actual,
    alchemy: {
      ...actual.alchemy,
      getSolBalance: vi.fn(),
      getTokenBalances: vi.fn(),
    },
  };
});

vi.mock("../../integrations/market", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/market")>();
  return {
    ...actual,
    market: { ...actual.market, token: vi.fn() },
  };
});

const mockGetSolBalance = vi.mocked(alchemy.getSolBalance);
const mockGetTokenBalances = vi.mocked(alchemy.getTokenBalances);
const mockToken = vi.mocked(market.token);

const WSOL = "So11111111111111111111111111111111111111112";
const BONK = "DezXAZ8z7PnrnRJjz3gnnr7oNkmw6MEv1QyMXXNbB263";
const WIF = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL262aJ9FAfZ";
const SPAM = "spam111111111111111111111111111111111111111";
const WALLET = "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";

const session: AuthSession = {
  privyId: "did:privy:portfolio-user",
  email: "portfolio@fomo.family",
  walletAddress: WALLET,
};

const nullWalletSession: AuthSession = {
  ...session,
  privyId: "did:privy:no-wallet",
  walletAddress: null,
};

const tokenBalance = (
  address: string,
  amount: number,
  decimals = 6
): TokenBalance => ({
  address,
  amount,
  decimals,
});

const detail = (
  address: string,
  symbol: string,
  priceUsd: number,
  logoUri: string | null = null
): TokenDetail => ({
  address,
  symbol,
  name: symbol,
  logoUri,
  priceUsd,
  change24h: 0,
  volume24h: 0,
  marketCap: 0,
  liquidity: 0,
  holders: 0,
  totalSupply: 0,
  description: null,
  links: {},
});

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await close();
});

it("rejects anonymous portfolio reads", async () => {
  await expect(
    call(appRouter.portfolio.balances, undefined, {
      context: testContext(db),
    })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  await expect(
    call(
      appRouter.portfolio.position,
      { address: BONK },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  expect(mockGetSolBalance).not.toHaveBeenCalled();
  expect(mockGetTokenBalances).not.toHaveBeenCalled();
  expect(mockToken).not.toHaveBeenCalled();
});

it("rejects a session with no embedded wallet", async () => {
  await expect(
    call(appRouter.portfolio.balances, undefined, {
      context: testContext(db, nullWalletSession),
    })
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  await expect(
    call(
      appRouter.portfolio.position,
      { address: BONK },
      { context: testContext(db, nullWalletSession) }
    )
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  expect(mockGetSolBalance).not.toHaveBeenCalled();
  expect(mockGetTokenBalances).not.toHaveBeenCalled();
  expect(mockToken).not.toHaveBeenCalled();
});

it("returns SOL, priced token balances, and total value", async () => {
  mockGetSolBalance.mockResolvedValue(2.5);
  mockGetTokenBalances.mockResolvedValue([
    tokenBalance(BONK, 1000),
    tokenBalance(WIF, 3),
  ]);
  mockToken.mockImplementation(({ address }) => {
    if (address === WSOL) {
      return Promise.resolve(detail(WSOL, "SOL", 150));
    }
    if (address === BONK) {
      return Promise.resolve(
        detail(BONK, "BONK", 0.000_02, "https://example.com/bonk.png")
      );
    }
    if (address === WIF) {
      return Promise.resolve(detail(WIF, "WIF", 2));
    }
    return Promise.resolve(null);
  });

  const result = await call(appRouter.portfolio.balances, undefined, {
    context: testContext(db, session),
  });

  expect(mockGetSolBalance).toHaveBeenCalledWith(WALLET);
  expect(mockGetTokenBalances).toHaveBeenCalledWith(WALLET);
  expect(mockToken).toHaveBeenCalledWith({ address: WSOL });
  expect(result).toEqual({
    solBalance: 2.5,
    tokens: [
      {
        address: BONK,
        symbol: "BONK",
        logoUri: "https://example.com/bonk.png",
        amount: 1000,
        priceUsd: 0.000_02,
        valueUsd: 0.02,
      },
      {
        address: WIF,
        symbol: "WIF",
        logoUri: null,
        amount: 3,
        priceUsd: 2,
        valueUsd: 6,
      },
    ],
    totalValueUsd: 381.02,
  });
});

it("skips unpriced and zero-amount tokens from balances", async () => {
  mockGetSolBalance.mockResolvedValue(1);
  mockGetTokenBalances.mockResolvedValue([
    tokenBalance(BONK, 10),
    tokenBalance(SPAM, 25),
    tokenBalance(WIF, 0),
  ]);
  mockToken.mockImplementation(({ address }) => {
    if (address === WSOL) {
      return Promise.resolve(detail(WSOL, "SOL", 100));
    }
    if (address === BONK) {
      return Promise.resolve(detail(BONK, "BONK", 0.5));
    }
    return Promise.resolve(null);
  });

  const result = await call(appRouter.portfolio.balances, undefined, {
    context: testContext(db, session),
  });

  expect(mockToken).not.toHaveBeenCalledWith({ address: WIF });
  expect(result.tokens).toEqual([
    {
      address: BONK,
      symbol: "BONK",
      logoUri: null,
      amount: 10,
      priceUsd: 0.5,
      valueUsd: 5,
    },
  ]);
  expect(result.totalValueUsd).toBe(105);
});

it("returns a held token position with unknown cost basis as null P/L", async () => {
  mockGetTokenBalances.mockResolvedValue([tokenBalance(BONK, 2500)]);
  mockToken.mockResolvedValue(detail(BONK, "BONK", 0.000_03));

  const result = await call(
    appRouter.portfolio.position,
    { address: BONK },
    { context: testContext(db, session) }
  );

  expect(mockGetTokenBalances).toHaveBeenCalledWith(WALLET);
  expect(mockToken).toHaveBeenCalledWith({ address: BONK });
  expect(result).toEqual({
    address: BONK,
    amount: 2500,
    valueUsd: 0.075,
    avgBuyUsd: null,
    pnlUsd: null,
    pnlPct: null,
  });
});

it("returns null when the wallet has no positive balance for the token", async () => {
  mockGetTokenBalances.mockResolvedValue([
    tokenBalance(BONK, 0),
    tokenBalance(WIF, 1),
  ]);

  await expect(
    call(
      appRouter.portfolio.position,
      { address: BONK },
      { context: testContext(db, session) }
    )
  ).resolves.toBeNull();

  expect(mockToken).not.toHaveBeenCalled();
});

it("rejects an invalid position mint with BAD_REQUEST before upstream calls", async () => {
  await expect(
    call(
      appRouter.portfolio.position,
      { address: "not-a-real-mint" },
      { context: testContext(db, session) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  expect(mockGetTokenBalances).not.toHaveBeenCalled();
  expect(mockToken).not.toHaveBeenCalled();
});

it("maps upstream 429s to RATE_LIMITED", async () => {
  mockGetSolBalance.mockResolvedValue(1);
  mockGetTokenBalances.mockRejectedValue(new RateLimitError());

  await expect(
    call(appRouter.portfolio.balances, undefined, {
      context: testContext(db, session),
    })
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });

  await expect(
    call(
      appRouter.portfolio.position,
      { address: BONK },
      { context: testContext(db, session) }
    )
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("maps upstream failures to UPSTREAM_ERROR", async () => {
  mockGetSolBalance.mockRejectedValue(new UpstreamError("bad rpc envelope"));
  mockGetTokenBalances.mockResolvedValue([]);

  await expect(
    call(appRouter.portfolio.balances, undefined, {
      context: testContext(db, session),
    })
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});
