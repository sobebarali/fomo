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

## Testing

`auth`/protected-router tests inject a fake verified session (or `null`) via `testContext` — no real
Privy call. The verifier's own claim-checking gets a unit test. Opt-in `privy.smoke.ts` verifies a real
token out-of-band.

## Links

Auth: [`../../routers/auth/AGENTS.md`](../../routers/auth/AGENTS.md) · Context: [`../../../AGENTS.md`](../../../AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md)
