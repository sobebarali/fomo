# `privy` integration

> Server-side **Privy** token verification — turns the request's Privy auth token into a trusted
> session for `context.auth`. The mocked edge in tests. Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

- **Auth:** `NEXT_PUBLIC_PRIVY_APP_ID` (public, client SDK) + `PRIVY_APP_SECRET` (server-only, verification).

## Surface

| Method | Returns | Used by |
|--------|---------|---------|
| `verifyToken(req)` | `{ privyId, email, walletAddress } \| null` (null = no/invalid token) | `createContext` → `context.auth`; `auth` router |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Verify the token's signature/claims with the **server secret** — never trust client-sent identity. | A forged token must not yield a session (root domain rule). |
| Public app id is the only Privy value in the client bundle; the secret stays server-side. | Secrets never reach the browser. |
| `verifyToken` returns `null` (not throws) on missing/invalid token; the protected procedure raises `UNAUTHORIZED`. | One clear unauth path; `null` is an expected state, not an error. |
| Injectable verifier/`fetch` for tests. | Build a fake "verified session" in `testContext` without a real Privy call. |

## Implementation (CET-217)

`createPrivyClient(options?)` → `{ verifyToken(req) }`; `privy` is the shared singleton `createContext`
uses. SDK: **`@privy-io/node`** (`PrivyClient`) — rejected hand-rolling JWKS/JWT with `jose` (reinvents
the SDK).

`verifyToken(req)`:
1. Read the access token from `Authorization: Bearer` → fall back to the `privy-token` cookie; none → `null`.
2. `privy.utils().auth().verifyAccessToken(token)` (offline; JWKS auto-fetched + cached from app id +
   secret) → `user_id`. Throws (forged/expired/wrong app) → `null`.
3. Fetch the user (`privy.users()._get(privyId)`), parse `linked_accounts` → `email` (email account,
   else Google/Apple OAuth) + the **embedded Solana** wallet address.

**Decisions (Rule 16):**
- **Access token + getUser** (spec-literal): the token carries only `privyId`, so email/wallet come from
  one user fetch. `// ponytail:` it's cached per `privyId` (60s, `_shared/cache`) — token verification
  still runs every call so expiry is always honored.
- **getUser failure degrades, never 500s**: a verified token already proves identity, so a fetch/parse
  failure yields `{ privyId, email: null, walletAddress: null }` rather than failing every protected
  request.
- **App id read from `@fomo/env/web`** (`NEXT_PUBLIC_PRIVY_APP_ID`, public — safe server-side); secret
  from `@fomo/env/server`. No new env var.
- **Injectable `verifyAccessToken`/`getUser` seams**; the real SDK client is built lazily, so importing
  this module (and protected-router tests) stays offline.

## Testing

`auth`/protected-router tests inject a fake verified session (or `null`) via `testContext` — no real
Privy call. The verifier's own logic (token extraction, forged/expired → `null`, email/wallet
extraction, getUser-failure degradation, per-`privyId` caching) is unit-tested in `index.test.ts` with
injected seams. Opt-in `privy.smoke.ts` verifies a real token out-of-band.

## Links

Auth: [`../../routers/auth/AGENTS.md`](../../routers/auth/AGENTS.md) · Context: [`../../../AGENTS.md`](../../../AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md)
