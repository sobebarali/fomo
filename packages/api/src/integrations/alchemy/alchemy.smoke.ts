/**
 * Opt-in real-key contract check — NOT part of the normal test run (the vitest `include` glob only
 * picks up `*.{test,spec}.ts`). It hits the live Alchemy RPC and asserts both methods still parse,
 * catching field drift the mocked unit test can't.
 *
 *   ALCHEMY_RPC_URL=<url> bun run packages/api/src/integrations/alchemy/alchemy.smoke.ts
 *
 * Skips with a message if `ALCHEMY_RPC_URL` is unset. The dynamic import below runs after we set
 * `SKIP_ENV_VALIDATION`, so only `ALCHEMY_RPC_URL` is required (not the full server env).
 */
import assert from "node:assert/strict";

// A wallet with SOL + SPL token balances (real, mainnet).
const WALLET = "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ";

async function main(): Promise<void> {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;
  if (!rpcUrl) {
    process.stdout.write("alchemy smoke skipped: ALCHEMY_RPC_URL not set\n");
    return;
  }
  if (!process.env.SKIP_ENV_VALIDATION) {
    process.env.SKIP_ENV_VALIDATION = "1";
  }

  const { createAlchemyClient } = await import("./index");
  const client = createAlchemyClient({ rpcUrl });

  const sol = await client.getSolBalance(WALLET);
  assert.equal(typeof sol, "number", "sol balance is a number");
  assert.ok(sol > 0, "sol balance is positive");

  const tokens = await client.getTokenBalances(WALLET);
  assert.ok(Array.isArray(tokens), "token balances is an array");
  assert.ok(tokens.length > 0, "token balances is non-empty");
  assert.equal(typeof tokens[0]?.address, "string", "token has a mint address");
  assert.equal(typeof tokens[0]?.amount, "number", "token has an amount");
  assert.equal(typeof tokens[0]?.decimals, "number", "token has decimals");

  process.stdout.write("alchemy smoke ok\n");
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`alchemy smoke failed: ${String(error)}\n`);
});
