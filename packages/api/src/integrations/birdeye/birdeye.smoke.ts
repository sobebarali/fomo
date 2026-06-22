/**
 * Opt-in real-key contract check — NOT part of the normal test run (the vitest `include` glob only
 * picks up `*.{test,spec}.ts`). It hits the live BirdEye API and asserts every method's payload still
 * parses, catching field drift the mocked unit test can't.
 *
 *   BIRDEYE_API_KEY=<key> bun run packages/api/src/integrations/birdeye/birdeye.smoke.ts
 *
 * Skips with a message if `BIRDEYE_API_KEY` is unset. The dynamic import below runs after we set
 * `SKIP_ENV_VALIDATION`, so only `BIRDEYE_API_KEY` is required (not the full server env).
 */
import assert from "node:assert/strict";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const SOL = "So11111111111111111111111111111111111111112";

async function main(): Promise<void> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    process.stdout.write("birdeye smoke skipped: BIRDEYE_API_KEY not set\n");
    return;
  }
  if (!process.env.SKIP_ENV_VALIDATION) {
    process.env.SKIP_ENV_VALIDATION = "1";
  }

  const { createBirdEyeClient } = await import("./index");
  const client = createBirdEyeClient({ apiKey });
  const nowSec = Math.floor(Date.now() / 1000);

  const trending = await client.trending({
    sort: "trending",
    limit: 5,
    offset: 0,
  });
  assert.ok(Array.isArray(trending), "trending is an array");
  assert.ok(trending.length > 0, "trending is non-empty");
  assert.equal(
    typeof trending[0]?.address,
    "string",
    "trending item has address"
  );
  assert.equal(
    typeof trending[0]?.priceUsd,
    "number",
    "trending item has priceUsd"
  );

  const detail = await client.token({ address: BONK });
  assert.ok(detail, "token detail present for a known mint");

  const candles = await client.ohlcv({
    address: BONK,
    interval: "15m",
    from: nowSec - 3600,
    to: nowSec,
  });
  assert.ok(Array.isArray(candles), "ohlcv is an array");

  const holders = await client.holders({ address: BONK, limit: 10 });
  assert.ok(Array.isArray(holders), "holders is an array");

  const trades = await client.trades({ address: BONK, limit: 10 });
  assert.ok(Array.isArray(trades), "trades is an array");

  const prices = await client.prices({ addresses: [SOL] });
  assert.equal(typeof prices[SOL], "number", "prices map has a SOL price");

  process.stdout.write("birdeye smoke ok\n");
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`birdeye smoke failed: ${String(error)}\n`);
});
