# `birdeye` integration

> The single server-side client for **BirdEye** (token data, prices, OHLCV, holders, trades). Owns the
> API key, caching, and rate-limiting so every router stays free-tier safe and thin. **This is the
> mocked edge in tests** — no router test ever hits BirdEye. Reference integration shape. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

- **Base URL:** `https://public-api.birdeye.so` · **Auth:** `X-API-KEY: env.BIRDEYE_API_KEY` (server-only) · **Chain:** `x-chain: solana`.

## Surface

Every method takes a single **destructured object** arg.

| Method | Returns | Used by |
|--------|---------|---------|
| `trending({ sort, limit, offset })` | `TokenSummary[]` | `tokens.trending`, banners |
| `token({ address })` | `TokenDetail \| null` | `tokens.get` |
| `ohlcv({ address, interval, from, to })` | `Candle[]` | `chart.candles` |
| `holders({ address, limit })` | `Holder[]` | `holders.list` |
| `trades({ address, limit })` | `Trade[]` | `trades.recent` |
| `prices({ addresses })` | `Record<address, number>` | `portfolio` |

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
- Each `methods/<name>.test.ts` asserts normalization against a real payload in `__fixtures__/`
  (stubbed `fetch`, offline). `cache`/`limiter`/`request` have their own unit tests (error mapping +
  key-safety live in `request.test.ts`). Helpers in `test-helpers.ts`.
- **Fixtures are REAL** — every `__fixtures__/*.json` is captured from the live BirdEye API, so the
  per-method schemas are pinned to real field names (re-capture if BirdEye changes its shape).
- A real-key `birdeye.smoke.ts` (opt-in, not in the normal run) verifies the live contract out-of-band.

## Implementation (M1.2)

`createBirdEyeClient(options?)` → the client; `birdeye` is the shared singleton routers import (one
cache, one limiter, key from `@fomo/env/server`). Options (all optional): `fetch` (default global —
the test seam), `apiKey` (default `env.BIRDEYE_API_KEY`), `baseUrl`, `requestsPerSecond` (default **1** —
the free Standard tier's per-account limit; raise on a paid plan: Lite/Starter 15, Premium 50),
`cacheMax` (default 500). Routers `instanceof`-map `RateLimitError` / `UpstreamError` imported directly
from [`../_shared/errors`](../_shared/errors.ts), and import the view types from [`./schema`](./schema.ts)
— `index.ts` exports no re-export barrel (the `noBarrelFile` lint rule forbids `export … from` here).

**Cache + limiter — decision (Rule 16):** hand-rolled, **zero new deps** — a bounded-TTL `Map`
(FIFO-evict at `cacheMax`) + a token-bucket limiter, now in [`_shared/`](../_shared/AGENTS.md) (cache /
limiter / errors / parse, extracted on the 3rd integration). Rejected `lru-cache` / `p-throttle`: on Vercel
serverless both are per-instance regardless (reset on cold start, no cross-instance coordination), so
a dep buys little; a shared Upstash/Redis limit is the only true fleet-wide control and is out of M12
scope. Add it if/when a fleet-wide limit is needed.

**Endpoints + per-method cache TTL** (response shapes captured from the live API into `__fixtures__/`):

| Method | `GET` path | TTL |
|--------|-----------|-----|
| `trending` | `/defi/token_trending` (`sort_by`/`sort_type` from `sort`) | 60s (redirect + sidebar + banners share it every /trade visit) |
| `token` | `/defi/token_overview?address=` (null/`success:false` → `null` → router `NOT_FOUND`) | 30s |
| `ohlcv` | `/defi/ohlcv?address=&type=&time_from=&time_to=` | 300s (ranges immutable) |
| `holders` | `/defi/v3/token/holder?address=&offset=0&limit=` | 30s |
| `trades` | `/defi/txs/token?…&tx_type=swap&sort_type=desc` — USD from `basePrice`, amount from `base.uiAmount` (no flat `volumeUSD`) | 5s |
| `prices` | `/defi/price?address=` **per address**, cached per token (the `/defi/multi_price` batch endpoint is plan-gated → 401) | 5s |

Read paths cache-first (a hit takes no rate-limit token). `429` → `RateLimitError`; any other non-2xx,
transport failure, invalid JSON, `success:false`, or Zod-parse failure → `UpstreamError` (messages
carry no key).

**File layout — one function per file (feature-colocated).**

| File | Owns |
|------|------|
| `index.ts` | `createBirdEyeClient(opts)` (assembles the context, wires every method) + the `birdeye` singleton. No re-export barrel — consumers import errors from `_shared/errors`, view types from `schema.ts`. |
| `context.ts` | `createContext(opts) → { request, cache }` + `BirdEyeClientOptions` — builds the limiter, requester, and cache **once** (one cache, one limiter shared by all methods). |
| `request.ts` | the shared transport: rate-limit → `fetch` (key header) → status/JSON/envelope error mapping. |
| [`_shared/`](../_shared/AGENTS.md) | `cache.ts` · `limiter.ts` · `errors.ts` · `parse.ts` — bounded TTL cache · token-bucket limiter · `RateLimitError`/`UpstreamError` · `parseData` (shared by every integration). |
| `schema.ts` | **shared** view types (`TokenSummary`/`TokenDetail`/`Candle`/`Holder`/`Trade`) + `Envelope` + `TrendingSort`. Promote to `src/schemas/token.ts` once a 2nd module needs them. |
| `methods/<name>.ts` | one method each — `makeX(ctx)` factory + its raw upstream schema + normalizer + TTL colocated. |
| `__fixtures__/*.json` | real BirdEye payloads the method tests assert against. |

Each `methods/<name>.ts` Zod-validates its endpoint's raw payload and normalizes to the shared view
type; `index.ts` never re-derives shapes.

## Links

Tokens: [`../../routers/tokens/AGENTS.md`](../../routers/tokens/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
