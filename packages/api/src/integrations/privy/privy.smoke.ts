/**
 * Opt-in real-token contract check — NOT part of the normal test run (the vitest `include` glob only
 * picks up `*.{test,spec}.ts`). It verifies a live Privy access token end-to-end, catching JWKS /
 * user-shape drift the mocked unit test can't.
 *
 *   PRIVY_TOKEN=<access-token> NEXT_PUBLIC_PRIVY_APP_ID=<app-id> PRIVY_APP_SECRET=<secret> \
 *     bun run packages/api/src/integrations/privy/privy.smoke.ts
 *
 * Skips with a message if `PRIVY_TOKEN` is unset. The dynamic import below runs after we set
 * `SKIP_ENV_VALIDATION`, so only the three Privy vars are required (not the full server env).
 */
import assert from "node:assert/strict";

async function main(): Promise<void> {
  const token = process.env.PRIVY_TOKEN;
  if (!token) {
    process.stdout.write("privy smoke skipped: PRIVY_TOKEN not set\n");
    return;
  }
  if (!process.env.SKIP_ENV_VALIDATION) {
    process.env.SKIP_ENV_VALIDATION = "1";
  }

  const { createPrivyClient } = await import("./index");
  const client = createPrivyClient();

  const req = new Request("http://localhost/api/rpc", {
    headers: { authorization: `Bearer ${token}` },
  });
  const session = await client.verifyToken(req);

  assert.ok(session, "a valid token yields a session");
  assert.equal(typeof session.privyId, "string", "session has a privyId");
  assert.ok(session.privyId.startsWith("did:privy:"), "privyId is a Privy DID");

  // A forged token must never yield a session.
  const forged = new Request("http://localhost/api/rpc", {
    headers: { authorization: "Bearer not-a-real-token" },
  });
  assert.equal(await client.verifyToken(forged), null, "forged token → null");

  process.stdout.write(
    `privy smoke ok: ${session.privyId} email=${session.email ?? "-"} wallet=${session.walletAddress ?? "-"}\n`
  );
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`privy smoke failed: ${String(error)}\n`);
});
