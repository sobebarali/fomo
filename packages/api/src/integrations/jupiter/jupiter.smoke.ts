/**
 * Opt-in real-route contract check — NOT part of the normal test run (vitest's `include` glob only
 * picks up `*.{test,spec}.ts`). It hits the live Jupiter Swap V2 API and asserts both methods still
 * parse, catching field drift the mocked unit tests can't.
 *
 *   bun run packages/api/src/integrations/jupiter/jupiter.smoke.ts
 *
 * Runs on the keyless tier (no secret needed); set JUPITER_API_KEY for a higher rate-limit tier. The
 * dynamic import runs after we set `SKIP_ENV_VALIDATION`, so the full server env isn't required.
 */
import assert from "node:assert/strict";

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// A mainnet wallet funded with SOL, so the order assembles a real (unsigned) transaction.
const TAKER = "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";
const BASE_UNIT_INTEGER = /^\d+$/;

async function main(): Promise<void> {
  if (!process.env.SKIP_ENV_VALIDATION) {
    process.env.SKIP_ENV_VALIDATION = "1";
  }

  const { createJupiterClient } = await import("./index");
  // Keyless tier is ~0.5 RPS; pass the key (if set) for a higher tier.
  const client = createJupiterClient({
    apiKey: process.env.JUPITER_API_KEY,
    requestsPerSecond: 0.5,
  });

  const quote = await client.quote({
    inputMint: SOL,
    outputMint: USDC,
    amount: "100000000",
    slippageBps: 50,
  });
  assert.equal(typeof quote.outAmount, "string", "outAmount is a string");
  assert.ok(
    BASE_UNIT_INTEGER.test(quote.outAmount),
    "outAmount is a base-unit integer string"
  );
  assert.ok(quote.routePlan.length > 0, "quote carries a route plan");

  const built = await client.swapTransaction({
    inputMint: SOL,
    outputMint: USDC,
    amount: "10000",
    slippageBps: 50,
    userPublicKey: TAKER,
  });
  assert.equal(
    typeof built.swapTransaction,
    "string",
    "swapTransaction is a string"
  );
  assert.ok(
    built.swapTransaction.length > 0,
    "swapTransaction is a non-empty unsigned base64 tx"
  );

  process.stdout.write("jupiter smoke ok\n");
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`jupiter smoke failed: ${String(error)}\n`);
});
