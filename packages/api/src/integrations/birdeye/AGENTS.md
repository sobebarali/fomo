# `birdeye` integration

> The single server-side client for **BirdEye** (token data, prices, OHLCV, holders, trades). Owns the
> API key, caching, and rate-limiting so every router stays free-tier safe and thin. **This is the
> mocked edge in tests** — no router test ever hits BirdEye. Reference integration shape. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

- **Base URL:** `https://public-api.birdeye.so` · **Auth:** `X-API-KEY: env.BIRDEYE_API_KEY` (server-only) · **Chain:** `x-chain: solana`.

## Surface

| Method | Returns | Used by |
|--------|---------|---------|
| `trending({ sort, limit, offset })` | `TokenSummary[]` | `tokens.trending`, banners |
| `token(address)` | `TokenDetail` | `tokens.get` |
| `ohlcv(address, interval, { from, to })` | `Candle[]` | `chart.candles` |
| `holders(address, limit)` | `Holder[]` | `holders.list` |
| `trades(address, limit)` | `Trade[]` | `trades.recent` |
| `prices(addresses[])` | `Record<address, number>` | `portfolio` |

Each method validates the upstream payload with Zod and returns typed data or throws a tagged error.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Key from `@fomo/env/server` only; never logged, never sent to the client. | Root domain rule — secrets never reach the browser. |
| **Cache** read-through keyed by endpoint+args (closed candles long-TTL, prices/trades short-TTL); **rate-limit** to stay under free-tier RPS. | Free-tier survival; one cache, not per-router (root domain rule). |
| Map upstream `429` → a tagged `RateLimitError`; non-2xx / Zod-parse failure → `UpstreamError`. Routers translate these to `RATE_LIMITED` / `UPSTREAM_ERROR`. | One error vocabulary at the edge → stable router codes. |
| The client takes an injectable `fetch` (defaults to global). | Tests stub `fetch`/the client without touching the network. |

## Testing

- Router tests **mock this client** (`vi.mock` or inject a fake) — assert the router's mapping/shape.
- The client's own parsing/caching/limiter logic gets a unit test with a stubbed `fetch`.
- A real-key `birdeye.smoke.ts` (opt-in, not in the normal run) verifies the live contract out-of-band.

## Links

Tokens: [`../../routers/tokens/AGENTS.md`](../../routers/tokens/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
