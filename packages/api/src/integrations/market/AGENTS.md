# `market` integration (facade)

> The market-data client the routers depend on. BirdEye is the primary source because it is the
> product-specified provider and the account has CU quota again; keyless/free providers remain as
> cascaded fallbacks for rate limits, upstream failures, or empty reads. Returns the shared view types
> ([`../../schemas/token.ts`](../../schemas/token.ts)) and throws the same `_shared`
> `RateLimitError`/`UpstreamError`. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Surface → source

| Method | Primary | Fallback |
|--------|---------|----------|
| `trending({ sort, limit, offset })` | [`birdeye`](../birdeye/AGENTS.md) | [`geckoterminal`](../geckoterminal/AGENTS.md) organic trending pools |
| `token({ address })` | `birdeye` token overview | [`dexscreener`](../dexscreener/AGENTS.md) token pairs + [`alchemy`](../alchemy/AGENTS.md) `getTokenSupply` |
| `ohlcv({ address, interval, from, to })` | `birdeye` OHLCV | `geckoterminal` resolve pool → OHLCV |
| `trades({ address, limit })` | `birdeye` token swaps | `geckoterminal` resolve pool → pool trades |
| `holders({ address, limit })` | `birdeye` holders | `alchemy` largest accounts → owners |

`createMarketClient(deps?)` takes injectable `{ birdeye, dexscreener, geckoterminal, alchemy }`
(defaults to the real singletons) so tests inject fakes; `market` is the shared instance.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| BirdEye is tried first for every market surface; `RateLimitError` / `UpstreamError` / empty reads cascade to the free fallback source. | Keeps the product aligned with `TASK.md` while preserving graceful degradation if BirdEye quota/provider health regresses. |
| The `token` fallback runs DexScreener + Alchemy `getTokenSupply` in parallel; a supply failure degrades `totalSupply` to `0` (never fails the read). | Supply is enrichment; the price/header is the critical path. |
| Errors are the sub-clients' `_shared` `RateLimitError`/`UpstreamError` — no new vocabulary. | Routers' `instanceof` mapping (`RATE_LIMITED`/`UPSTREAM_ERROR`) is unchanged. |

## Degradations

When BirdEye cascades, `TokenDetail.holders` (count) may degrade to `0` and `description` to `null`
(no free O(1) source); see [`../dexscreener/AGENTS.md`](../dexscreener/AGENTS.md). Holders list is
capped at top-20; if GeckoTerminal is used, trending gainers/new reuse the organic list and long chart
ranges may be partial — see [`../geckoterminal/AGENTS.md`](../geckoterminal/AGENTS.md).

## Links

Sources: [`../birdeye/AGENTS.md`](../birdeye/AGENTS.md) · [`../dexscreener/AGENTS.md`](../dexscreener/AGENTS.md) · [`../geckoterminal/AGENTS.md`](../geckoterminal/AGENTS.md) · [`../alchemy/AGENTS.md`](../alchemy/AGENTS.md) · API: [`../../AGENTS.md`](../../AGENTS.md)
