# `market` integration (facade)

> The market-data client the routers depend on. Composes the free, **non-CU** sources so the app no
> longer burns BirdEye's compute-unit quota. Returns the shared view types
> ([`../../schemas/token.ts`](../../schemas/token.ts)) and throws the same `_shared`
> `RateLimitError`/`UpstreamError`, so it is a drop-in for the old `birdeye` singleton — routers
> changed only their import. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Surface → source

| Method | Source |
|--------|--------|
| `trending({ sort, limit, offset })` | [`geckoterminal`](../geckoterminal/AGENTS.md) (organic trending pools) |
| `token({ address })` | [`dexscreener`](../dexscreener/AGENTS.md) (price/mc/vol/liq/logo/links) **+** [`alchemy`](../alchemy/AGENTS.md) `getTokenSupply` for `totalSupply` |
| `ohlcv({ address, interval, from, to })` | `geckoterminal` (resolve pool → OHLCV) |
| `trades({ address, limit })` | `geckoterminal` (resolve pool → pool trades) |
| `holders({ address, limit })` | `alchemy` (largest accounts → owners) |

`createMarketClient(deps?)` takes injectable `{ dexscreener, geckoterminal, alchemy }` (defaults to the
real singletons) so tests inject fakes; `market` is the shared instance. **No BirdEye anywhere** — its
CU quota is exhausted/unused.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| `token` runs DexScreener + Alchemy `getTokenSupply` in parallel; a supply failure degrades `totalSupply` to `0` (never fails the read). | Supply is enrichment; the price/header is the critical path. |
| Errors are the sub-clients' `_shared` `RateLimitError`/`UpstreamError` — no new vocabulary. | Routers' `instanceof` mapping (`RATE_LIMITED`/`UPSTREAM_ERROR`) is unchanged. |
| No BirdEye fallback (yet). | Keeps the CU quota truly untouched; a flagged fallback can be added later. |

## Degradations

`TokenDetail.holders` (count) → `0` and `description` → `null` (no free O(1) source); see
[`../dexscreener/AGENTS.md`](../dexscreener/AGENTS.md). Holders list capped at top-20; trending
gainers/new reuse the organic list; long chart ranges may be partial — see
[`../geckoterminal/AGENTS.md`](../geckoterminal/AGENTS.md).

## Links

Sources: [`../dexscreener/AGENTS.md`](../dexscreener/AGENTS.md) · [`../geckoterminal/AGENTS.md`](../geckoterminal/AGENTS.md) · [`../alchemy/AGENTS.md`](../alchemy/AGENTS.md) · API: [`../../AGENTS.md`](../../AGENTS.md)
