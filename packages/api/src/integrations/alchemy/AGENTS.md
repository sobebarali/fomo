# `alchemy` integration

> Server-side **Alchemy** Solana RPC client — wallet SOL + SPL token balances for `portfolio`. Owns the
> RPC URL (with key) and request batching. The mocked edge in tests. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

- **Endpoint:** `env.ALCHEMY_RPC_URL` (server-only; key embedded in the URL).

## Surface

| Method | Returns | Used by |
|--------|---------|---------|
| `getSolBalance(wallet)` | `number` (SOL) | `portfolio.balances` |
| `getTokenBalances(wallet)` | `Array<{ address: string; amount: number; decimals: number }>` | `portfolio.balances`, `portfolio.position` |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| RPC URL/key from `@fomo/env/server` only; never client-side. | Root domain rule — secrets never reach the browser. |
| Normalize lamports/base-units → human amounts using on-chain decimals at the edge. | Routers/UI get consistent numbers; one normalization point. |
| Map RPC `429`/limit → `RateLimitError`, other failures → `UpstreamError` (→ `RATE_LIMITED`/`UPSTREAM_ERROR`). | Stable codes; an RPC blip isn't a 500. |
| Injectable `fetch`/transport for tests. | Mock without hitting the network. |

## Testing

`portfolio` tests mock this client. The client's own decimal-normalization + error mapping get a unit
test with a stubbed transport. Opt-in `alchemy.smoke.ts` checks the live RPC out-of-band.

## Links

Portfolio: [`../../routers/portfolio/AGENTS.md`](../../routers/portfolio/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
