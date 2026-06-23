# `dexscreener` integration

> Free, **keyless** client for **DexScreener** — token market data (price, 24h change/volume, liquidity,
> market cap, logo, links). One of the free non-CU sources behind the [`market`](../market/AGENTS.md)
> facade that replaced BirdEye for the public reads. Reference shape:
> [`../birdeye/AGENTS.md`](../birdeye/AGENTS.md). Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

- **Base URL:** `https://api.dexscreener.com` (override `env.DEXSCREENER_BASE_URL`). **No API key.**
  **60 req/min** free limit → limiter defaults to 1 rps; the SWR cache is the real throttle.

## Surface

| Method | Returns | Endpoint |
|--------|---------|----------|
| `token({ address })` | `TokenDetail \| null` | `GET /tokens/v1/solana/{address}` |

The endpoint returns one canonical pair per token (a bare JSON array, **no `{success,data}` envelope**).
`token` picks the highest-`liquidity.usd` pair **where the queried mint is the base token** (so
`priceUsd` is this token's, not the counter-asset's); no such pair → `null` (router → `NOT_FOUND`).

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Keyless GET; the transport returns the parsed body directly (no envelope). | DexScreener responds with a bare array, unlike BirdEye's `{success,data}`. |
| `429 → RateLimitError`, other non-2xx / invalid JSON / transport fail → `UpstreamError`. | One error vocabulary at the edge → stable router codes (`RATE_LIMITED`/`UPSTREAM_ERROR`). |
| Returns the shared `TokenDetail` view type from [`../../schemas/token.ts`](../../schemas/token.ts). | Drop-in for the `market` facade; routers need no change. |

## Degradations (free-tier honest gaps)

- `TokenDetail.holders` → `0` and `description` → `null` (DexScreener provides neither). The `market`
  facade fills `totalSupply` from Alchemy `getTokenSupply`; a holder **count** has no free O(1) source.

## Testing

`methods/token.test.ts` asserts normalization against a **real** `__fixtures__/token.json` (captured
from the live API, stubbed `fetch`), plus the highest-liquidity/base-token-filter selection and the
empty/quote-only → `null` cases. `request.test.ts` covers the error mapping.

## Links

Market facade: [`../market/AGENTS.md`](../market/AGENTS.md) · Shared infra: [`../_shared/AGENTS.md`](../_shared/AGENTS.md) · API: [`../../AGENTS.md`](../../AGENTS.md)
