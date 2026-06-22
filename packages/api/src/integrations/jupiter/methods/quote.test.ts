import { expect, it } from "vitest";
import { UpstreamError } from "../../_shared/errors";
// fixture: REAL — captured from the live Jupiter API (GET /swap/v2/order, no taker).
import orderQuote from "../__fixtures__/order-quote.json";
import { jsonResponse, makeClient } from "../test-helpers";

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

it("normalizes the live order payload to a Quote", async () => {
  const { client } = makeClient(() =>
    Promise.resolve(jsonResponse(orderQuote))
  );

  const result = await client.quote({
    inputMint: SOL,
    outputMint: USDC,
    amount: "100000000",
    slippageBps: 50,
  });

  // priceImpactPct comes from the V2 `priceImpact` decimal; amounts stay verbatim strings.
  expect(result).toEqual({
    inAmount: "100000000",
    outAmount: "7411600",
    otherAmountThreshold: "7411600",
    priceImpactPct: -0.032_858_666_044_422_766,
    slippageBps: 0,
    routePlan: [{ label: "JupiterZ", percent: 100 }],
  });
});

it("preserves base-unit amounts as exact strings (no number round-trip)", async () => {
  const huge = {
    ...orderQuote,
    inAmount: "18446744073709551615",
    outAmount: "999999999999999999",
  };
  const { client } = makeClient(() => Promise.resolve(jsonResponse(huge)));

  const result = await client.quote({
    inputMint: SOL,
    outputMint: USDC,
    amount: "18446744073709551615",
  });

  expect(result.inAmount).toBe("18446744073709551615");
  expect(result.outAmount).toBe("999999999999999999");
});

it("throws UpstreamError when no route is found", async () => {
  const noRoute = {
    ...orderQuote,
    outAmount: null,
    errorCode: "NO_ROUTES_FOUND",
    errorMessage: "no route",
  };
  const { client } = makeClient(() => Promise.resolve(jsonResponse(noRoute)));

  await expect(
    client.quote({ inputMint: SOL, outputMint: USDC, amount: "1" })
  ).rejects.toBeInstanceOf(UpstreamError);
});
