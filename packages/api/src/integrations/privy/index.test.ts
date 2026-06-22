import { expect, it, vi } from "vitest";

import { createPrivyClient } from "./index";

const VALID_TOKEN = "valid-access-token";
const PRIVY_ID = "did:privy:abc123";
const WALLET = "So11111111111111111111111111111111111111112";

function bearer(token: string): Request {
  return new Request("http://localhost/api/rpc", {
    headers: { authorization: `Bearer ${token}` },
  });
}

const rejects = (message: string) => () => Promise.reject(new Error(message));

it("returns a session with email + embedded Solana wallet for a valid token", async () => {
  const client = createPrivyClient({
    verifyAccessToken: () => Promise.resolve({ user_id: PRIVY_ID }),
    getUser: () =>
      Promise.resolve({
        id: PRIVY_ID,
        linked_accounts: [
          { type: "email", address: "chad@fomo.family", verified_at: 1 },
          {
            type: "wallet",
            chain_type: "solana",
            connector_type: "embedded",
            address: WALLET,
            wallet_client: "privy",
          },
        ],
      }),
  });

  const session = await client.verifyToken(bearer(VALID_TOKEN));

  expect(session).toEqual({
    privyId: PRIVY_ID,
    email: "chad@fomo.family",
    walletAddress: WALLET,
  });
});

it("returns null for a forged or expired token", async () => {
  const client = createPrivyClient({
    verifyAccessToken: rejects("invalid token"),
    getUser: rejects("should not fetch"),
  });

  expect(await client.verifyToken(bearer("forged"))).toBeNull();
});

it("returns null when no token is present", async () => {
  const client = createPrivyClient({
    verifyAccessToken: rejects("should not verify"),
    getUser: rejects("should not fetch"),
  });

  expect(await client.verifyToken(new Request("http://localhost"))).toBeNull();
});

it("ignores a non-Bearer Authorization header", async () => {
  const client = createPrivyClient({
    verifyAccessToken: rejects("should not verify"),
    getUser: rejects("should not fetch"),
  });

  const req = new Request("http://localhost", {
    headers: { authorization: "Basic abc123" },
  });

  expect(await client.verifyToken(req)).toBeNull();
});

it("reads the token from the privy-token cookie when there is no Authorization header", async () => {
  const verifyAccessToken = vi.fn(() => Promise.resolve({ user_id: PRIVY_ID }));
  const client = createPrivyClient({
    verifyAccessToken,
    getUser: () => Promise.resolve({ id: PRIVY_ID, linked_accounts: [] }),
  });

  const req = new Request("http://localhost", {
    headers: { cookie: `privy-token=${VALID_TOKEN}; theme=dark` },
  });
  await client.verifyToken(req);

  expect(verifyAccessToken).toHaveBeenCalledWith(VALID_TOKEN);
});

it("falls back to the Google OAuth email when there is no email account", async () => {
  const client = createPrivyClient({
    verifyAccessToken: () => Promise.resolve({ user_id: PRIVY_ID }),
    getUser: () =>
      Promise.resolve({
        id: PRIVY_ID,
        linked_accounts: [
          { type: "google_oauth", email: "chad@gmail.com", subject: "x" },
        ],
      }),
  });

  const session = await client.verifyToken(bearer(VALID_TOKEN));

  expect(session?.email).toBe("chad@gmail.com");
});

it("returns null email + wallet when neither is linked", async () => {
  const client = createPrivyClient({
    verifyAccessToken: () => Promise.resolve({ user_id: PRIVY_ID }),
    getUser: () => Promise.resolve({ id: PRIVY_ID, linked_accounts: [] }),
  });

  const session = await client.verifyToken(bearer(VALID_TOKEN));

  expect(session).toEqual({
    privyId: PRIVY_ID,
    email: null,
    walletAddress: null,
  });
});

it("stays authenticated (null email/wallet) when the user fetch fails", async () => {
  const client = createPrivyClient({
    verifyAccessToken: () => Promise.resolve({ user_id: PRIVY_ID }),
    getUser: rejects("privy api down"),
  });

  const session = await client.verifyToken(bearer(VALID_TOKEN));

  expect(session).toEqual({
    privyId: PRIVY_ID,
    email: null,
    walletAddress: null,
  });
});

it("caches the user fetch per privyId across calls", async () => {
  const getUser = vi.fn(() =>
    Promise.resolve({ id: PRIVY_ID, linked_accounts: [] })
  );
  const client = createPrivyClient({
    verifyAccessToken: () => Promise.resolve({ user_id: PRIVY_ID }),
    getUser,
  });

  await client.verifyToken(bearer(VALID_TOKEN));
  await client.verifyToken(bearer(VALID_TOKEN));

  expect(getUser).toHaveBeenCalledTimes(1);
});
