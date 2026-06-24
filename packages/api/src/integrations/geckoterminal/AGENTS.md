# `geckoterminal` integration

> Free, **keyless** client for **GeckoTerminal** (CoinGecko's on-chain DEX API) — organic trending,
> OHLCV candles, and recent trades. One of the fallback sources behind the
> [`market`](../market/AGENTS.md) facade when BirdEye is empty/rate-limited/down. Reference shape:
> [`../birdeye/AGENTS.md`](../birdeye/AGENTS.md). Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

- **Base URL:** `https://api.geckoterminal.com/api/v2` (override `env.GECKOTERMINAL_BASE_URL`). **No
  key.** Pins its response shape behind the `Accept: application/json;version=20230302` header.
- **~30 req/min** free limit (the tightest of all sources) → limiter defaults to **0.4 rps**; the SWR
  cache + the single background poller are the real throttle. Required shared Upstash Redis from
  `@fomo/env/server` backs cache and rate limits.

## Surface

| Method | Returns | Endpoint |
|--------|---------|----------|
| `trending({ limit })` | `TokenSummary[]` | `GET /networks/solana/trending_pools?include=base_token` |
| `ohlcv({ address, interval, from, to })` | `Candle[]` | resolve pool → `GET /networks/solana/pools/{pool}/ohlcv/{timeframe}?aggregate=N` |
| `trades({ address, limit })` | `Trade[]` | resolve pool → `GET /networks/solana/pools/{pool}/trades` |

`resolve-pool.ts` (internal, `pool:{address}` cached 10min) maps a token → its primary pool
(highest `reserve_in_usd`, preferring pools where the token is the **base** so price/side read from
its POV); `ohlcv` + `trades` share that one resolve. Interval map: `1m→minute/1, 5m→minute/5,
15m→minute/15, 1H→hour/1, 4H→hour/4, 1D→day/1, 1W→day/7`. OHLCV `limit` is derived from the
requested `{ from, to, interval }` window and capped at GeckoTerminal's 1000-candle maximum, so a
24h/15m request asks for ~1 day of candles instead of the max page. Trade `kind` → `side`; a buy
reads the `to` side, a sell the `from` side.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Keyless GET with the versioned Accept header; transport returns the parsed JSON:API body. | GeckoTerminal versions its schema by header; `data` is array (trending/trades/pools) or object (ohlcv). |
| `429 → RateLimitError`, other non-2xx / invalid JSON / transport fail → `UpstreamError`. | Stable router codes (`RATE_LIMITED`/`UPSTREAM_ERROR`). |
| Returns the shared view types from [`../../schemas/token.ts`](../../schemas/token.ts). | Drop-in for the `market` facade; routers unchanged. |

## Degradations (free-tier honest gaps)

- `trending` is **organic-only** (~20 pools/page); `gainers`/`new` sorts reuse the same list (the
  sidebar's sort tabs aren't wired). OHLCV requests are sized to the requested range and capped at
  1000 candles, so very long `1Y`/`MAX` ranges
  may be partial (the chart island handles short/empty series). No pool for a token → empty series /
  trades (router → `NOT_FOUND` for chart).

## Testing

`methods/*.test.ts` assert normalization against **real** `__fixtures__/*.json` (stubbed `fetch`):
trending mapping, ohlcv tuple→Candle + interval→timeframe + highest-reserve pool pick, trades
buy/sell side mapping, and that ohlcv+trades reuse a single cached pool resolve. `request.test.ts`
covers the version header + error mapping.

## Links

Market facade: [`../market/AGENTS.md`](../market/AGENTS.md) · Shared infra: [`../_shared/AGENTS.md`](../_shared/AGENTS.md) · API: [`../../AGENTS.md`](../../AGENTS.md)
