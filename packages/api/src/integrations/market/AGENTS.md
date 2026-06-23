# `market` integration (facade)

> The market-data client the routers depend on. Composes the free, **non-CU** sources so the app no
> longer burns BirdEye's compute-unit quota. Returns the shared view types
> ([`../../schemas/token.ts`](../../schemas/token.ts)) and throws the same `_shared`
> `RateLimitError`/`UpstreamError`, so it is a drop-in for the old `birdeye` singleton — routers
> changed only their import. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Surface → source

| Method | Source |
|--------|--------|
| `token({ address })` | [`dexscreener`](../dexscreener/AGENTS.md) (price/mc/vol/liq/logo/links) **+** [`alchemy`](../alchemy/AGENTS.md) `getTokenSupply` for `totalSupply` |
| `holders({ address, limit })` | `alchemy` (largest accounts → owners) |
| `trending({ sort, limit, offset })` | [`birdeye`](../birdeye/AGENTS.md) — see note |
| `ohlcv({ address, interval, from, to })` | `birdeye` — see note |
| `trades({ address, limit })` | `birdeye` — see note |

`createMarketClient(deps?)` takes injectable `{ dexscreener, birdeye, alchemy }` (defaults to the real
singletons) so tests inject fakes; `market` is the shared instance.

> **Why trending/ohlcv/trades are still on BirdEye:** the intended free source for these,
> [`geckoterminal`](../geckoterminal/AGENTS.md), is **blocked from datacenter IPs** (CoinGecko/GeckoTerminal
> returns a non-JSON challenge to Railway → `UPSTREAM_ERROR`) — DexScreener + Alchemy work fine from the
> same host. So these three stay on BirdEye for now. The CU win still holds: `token` (BirdEye's heaviest
> consumer) moved to DexScreener, so usage is a fraction of before. The GeckoTerminal client is kept
> in-tree for a future proxy or a datacenter-friendly free source (e.g. Bitquery/Moralis).

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
