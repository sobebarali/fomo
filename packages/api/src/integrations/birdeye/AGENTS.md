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

## Implementation (M1.2)

`createBirdEyeClient(options?)` → the client; `birdeye` is the shared singleton routers import (one
cache, one limiter, key from `@fomo/env/server`). Options (all optional): `fetch` (default global —
the test seam), `apiKey` (default `env.BIRDEYE_API_KEY`), `baseUrl`, `requestsPerSecond` (default 10),
`cacheMax` (default 500). Exports `RateLimitError` / `UpstreamError` for routers to `instanceof`-map.

**Cache + limiter — decision (Rule 16):** hand-rolled, **zero new deps** — a bounded-TTL `Map`
(FIFO-evict at `cacheMax`) + a token-bucket limiter. Rejected `lru-cache` / `p-throttle`: on Vercel
serverless both are per-instance regardless (reset on cold start, no cross-instance coordination), so
a dep buys little; a shared Upstash/Redis limit is the only true fleet-wide control and is out of M12
scope. Add it if/when a fleet-wide limit is needed.

**Endpoints + per-method cache TTL** (exact response field names confirmed by `birdeye.smoke.ts`
against the live API — the docs hide the schema):

| Method | `GET` path | TTL |
|--------|-----------|-----|
| `trending` | `/defi/token_trending` (`sort_by`/`sort_type` from `sort`) | 15s |
| `token` | `/defi/token_overview?address=` (null/`success:false` → `null` → router `NOT_FOUND`) | 30s |
| `ohlcv` | `/defi/ohlcv?address=&type=&time_from=&time_to=` | 300s (ranges immutable) |
| `holders` | `/defi/v3/token/holder?address=&offset=0&limit=` | 30s |
| `trades` | `/defi/txs/token?address=&offset=0&limit=&tx_type=swap&sort_type=desc` | 5s |
| `prices` | `/defi/multi_price?list_address=` | 5s |

Read paths cache-first (a hit takes no rate-limit token). `429` → `RateLimitError`; any other non-2xx,
transport failure, invalid JSON, `success:false`, or Zod-parse failure → `UpstreamError` (messages
carry no key). Raw upstream fields are Zod-validated in `schema.ts`, then normalized to the view types
(`TokenSummary` / `TokenDetail` / `Candle` / `Holder` / `Trade`) which live there until a 2nd router
needs them.

## Links

Tokens: [`../../routers/tokens/AGENTS.md`](../../routers/tokens/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
