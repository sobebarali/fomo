# `jupiter` integration

> Server-side **Jupiter** client — swap quotes + unsigned swap-transaction building for `swap`. Never
> signs. The mocked edge in tests. Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

- **Base URL:** Jupiter swap API (`quote` + `swap`); key from `env` if the tier needs one (server-only).

## Surface

| Method | Returns | Used by |
|--------|---------|---------|
| `quote({ inputMint, outputMint, amount, slippageBps })` | `{ inAmount, outAmount, priceImpactPct, routePlan, ... }` (amounts are base-unit strings) | `swap.quote` |
| `swapTransaction({ quoteResponse, userPublicKey })` | `{ swapTransaction: string }` (base64 **unsigned** tx) | `swap.buildTransaction` |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Amounts in/out are base-unit **strings**, passed through untouched. | A JS-number round-trip silently corrupts large token amounts. |
| Returns an **unsigned** transaction only — signing is client-side via Privy. | The server never holds private keys (root domain rule). |
| "No route" / non-2xx → `UpstreamError` (→ `UPSTREAM_ERROR`); invalid params caught before the call. | Illiquid tokens shouldn't 500; stable codes. |
| Injectable `fetch` for tests. | Mock without the network. |

## Testing

`swap` tests mock this client (quote shape, base-unit strings, unsigned tx, no-route error). Opt-in
`jupiter.smoke.ts` quotes a real route out-of-band.

## Links

Swap: [`../../routers/swap/AGENTS.md`](../../routers/swap/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
