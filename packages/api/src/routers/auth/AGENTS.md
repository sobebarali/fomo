# `auth` router (`auth`)

> Sign-in with Apple/Google via **Privy**. Verifies the Privy session and exposes the current user;
> first sign-in upserts a `users` row. Verification runs through
> [`../../integrations/privy`](../../integrations/privy). Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `me` — the current signed-in user
- **Access:** protected
- **Input:** none
- **Output:** `{ userId: string; privyId: string; email: string | null; walletAddress: string | null }`
- **Errors:** `UNAUTHORIZED` (no/invalid Privy session) · `NOT_FOUND` (verified session but no `users` row yet — call `sync` first).
- **Side effects:** none.

### `sync` — upsert the user after sign-in
- **Access:** protected
- **Input:** none (identity comes from the verified Privy session on `context.auth`)
- **Output:** the `User` view (created on first call, else updated).
- **Errors:** `UNAUTHORIZED` · `CONFLICT` (duplicate `privyId` race → resolve to the existing row).
- **Side effects:** upserts one `users` row keyed on `privyId` (sets `email`/`walletAddress` from the session).

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The session is verified server-side by the `privy` integration and attached to `context.auth`; routers read it, never re-verify. | One verification path; the token never trusts client claims (root domain rule). |
| `sync` is idempotent — upsert on `privyId`, map the unique-collision race to the existing row. | Sign-in can fire concurrently; never 500 on a duplicate. |
| The embedded Solana wallet address comes from Privy, stored read-only; the server never holds keys. | Signing is client-side via Privy (root domain rule). |

## Dependencies

- **Calls:** `privy.verifyToken(req)` ([`../../integrations/privy`](../../integrations/privy)).
- **Writes:** `users` (`@fomo/db/schema`). **Feeds:** `portfolio` (wallet address), the whole protected surface.

## Hardest invariant — no trust without verification

`protected` procedures must reject (`UNAUTHORIZED`) unless the Privy token verifies server-side; a
forged/expired token never yields a user. Test with a faked verified session in `testContext` vs an
anonymous context asserting `UNAUTHORIZED`, and that `sync` twice yields one row (idempotent).

## Links

Privy: [`../../integrations/privy/AGENTS.md`](../../integrations/privy/AGENTS.md) ·
Users: [`../../../../db/AGENTS.md`](../../../../db/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
