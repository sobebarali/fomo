import type { Db } from "@fomo/db";
import { createTestDb } from "@fomo/db/testing";
import { call } from "@orpc/server";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  RateLimitError,
  UpstreamError,
} from "../../integrations/_shared/errors";
import { jupiter } from "../../integrations/jupiter";
import type { Quote } from "../../integrations/jupiter/schema";
import type { AuthSession } from "../../integrations/privy/schema";
import { testContext } from "../../test-support/context";
import { appRouter } from "../index";

vi.mock("../../integrations/jupiter", async (importActual) => {
  const actual =
    await importActual<typeof import("../../integrations/jupiter")>();
  return {
    ...actual,
    jupiter: {
      ...actual.jupiter,
      quote: vi.fn(),
      swapTransaction: vi.fn(),
    },
  };
});

const mockQuote = vi.mocked(jupiter.quote);
const mockSwapTransaction = vi.mocked(jupiter.swapTransaction);

const INPUT_MINT = "So11111111111111111111111111111111111111112";
const OUTPUT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USER_PUBLIC_KEY = "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";
const BASE_UNIT_AMOUNT = "100000000000000000000000001";

const session: AuthSession = {
  privyId: "did:privy:swap-user",
  email: "swap@fomo.family",
  walletAddress: USER_PUBLIC_KEY,
};

const quoteResult: Quote = {
  inAmount: BASE_UNIT_AMOUNT,
  outAmount: "7411600",
  otherAmountThreshold: "7374542",
  priceImpactPct: 0.12,
  routePlan: [{ label: "JupiterZ", percent: 100 }],
  slippageBps: 50,
};

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

it("returns a quote and preserves base-unit amount strings", async () => {
  mockQuote.mockResolvedValue(quoteResult);

  const result = await call(
    appRouter.swap.quote,
    {
      amount: BASE_UNIT_AMOUNT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
    },
    { context: testContext(db) }
  );

  expect(mockQuote).toHaveBeenCalledWith({
    amount: BASE_UNIT_AMOUNT,
    inputMint: INPUT_MINT,
    outputMint: OUTPUT_MINT,
    slippageBps: 50,
  });
  expect(result).toEqual(quoteResult);
});

it("forwards explicit slippage to Jupiter", async () => {
  mockQuote.mockResolvedValue({ ...quoteResult, slippageBps: 125 });

  await call(
    appRouter.swap.quote,
    {
      amount: "2500",
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      slippageBps: 125,
    },
    { context: testContext(db) }
  );

  expect(mockQuote).toHaveBeenCalledWith({
    amount: "2500",
    inputMint: INPUT_MINT,
    outputMint: OUTPUT_MINT,
    slippageBps: 125,
  });
});

it("rejects invalid quote input before any upstream call", async () => {
  await expect(
    call(
      appRouter.swap.quote,
      {
        amount: "0",
        inputMint: "not-a-mint",
        outputMint: OUTPUT_MINT,
      },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });

  expect(mockQuote).not.toHaveBeenCalled();
});

it("maps a Jupiter no-route failure to UPSTREAM_ERROR", async () => {
  mockQuote.mockRejectedValue(new UpstreamError("Jupiter returned no route"));

  await expect(
    call(
      appRouter.swap.quote,
      {
        amount: "1000",
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
      },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
});

it("maps a Jupiter 429 to RATE_LIMITED", async () => {
  mockQuote.mockRejectedValue(new RateLimitError());

  await expect(
    call(
      appRouter.swap.quote,
      {
        amount: "1000",
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
      },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("rejects anonymous buildTransaction calls", async () => {
  await expect(
    call(
      appRouter.swap.buildTransaction,
      {
        amount: "1000",
        inputMint: INPUT_MINT,
        outputMint: OUTPUT_MINT,
        userPublicKey: USER_PUBLIC_KEY,
      },
      { context: testContext(db) }
    )
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  expect(mockSwapTransaction).not.toHaveBeenCalled();
});

it("returns an unsigned transaction for an authenticated user", async () => {
  mockSwapTransaction.mockResolvedValue({
    requestId: "019eef41-2036-7562-a9b5-e39024cf1290",
    swapTransaction: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  });

  const result = await call(
    appRouter.swap.buildTransaction,
    {
      amount: BASE_UNIT_AMOUNT,
      inputMint: INPUT_MINT,
      outputMint: OUTPUT_MINT,
      slippageBps: 75,
      userPublicKey: USER_PUBLIC_KEY,
    },
    { context: testContext(db, session) }
  );

  expect(mockSwapTransaction).toHaveBeenCalledWith({
    amount: BASE_UNIT_AMOUNT,
    inputMint: INPUT_MINT,
    outputMint: OUTPUT_MINT,
    slippageBps: 75,
    userPublicKey: USER_PUBLIC_KEY,
  });
  expect(result).toEqual({
    swapTransaction: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  });
});
