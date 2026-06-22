# trade (trading page)

> The ChadWallet trading page at `/trade/[address]`. CET-228 implements the Penpot boards
> `03 · Trading — Desktop` and `04 · Trading — Mobile`: dark `#0b0f10`, neon green `#16e27b`,
> red sells `#f6465d`, compact square controls, dense market tables, and desktop top/bottom
> token banners. Parent: [`../../../AGENTS.md`](../../../AGENTS.md).

## Layout

- **Desktop:** top token banner → terminal header/search/balance/auth → 3-column shell → bottom token
  banner. Left = trending rows (`tokens.trending`), middle = token detail/stats/chart/tabs, right =
  buy/sell + position.
- **Mobile:** sticky token header with back/share/watch actions, chart + functional
  `LIVE/1D/1W/1M/1Y/MAX` range tabs (`1D` default), compact stats, `Trades`/`Holders`/`About` tabs,
  position card, swap panel, and sticky `Sell` / `Buy {SYMBOL}` actions.
- Every token reference (banner/list row) routes to `/trade/{address}` and the active row is matched
  by the route `address`.
- `/trade` (no address) is the **dashboard entry**: `page.tsx` redirects to the top trending token
  (fallback wrapped-SOL if trending is unavailable). Signed-in users hitting the landing are sent here
  by the `LandingRedirect` island.

## Data + boundaries

| Concern | Source | Boundary |
|---------|--------|----------|
| Trending list, token header, initial holders, initial trades, initial chart candles | `tokens`/`chart`/`holders`/`trades` | Server Components (cached public reads) |
| Chart render + range-tab refetch | `chart.candles` | client island (`lightweight-charts` area series); seeded by the server `15m` result, refetches per tab |
| Live trade refresh + tab state | `trades.recent` | client island; polls after hydration, seeded by the server result |
| Buy/sell quote + build/sign/send | `swap.quote` → `swap.buildTransaction` → Privy Solana wallet | client island; quote first, confirm before signing |
| Position | `portfolio.position` | protected client island; fetches only after Privy auth |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Static market reads render in RSC; only wallet, polling, and tab interactivity are client islands. | Secrets stay server-side; smaller bundle. |
| `tokens.get` `BAD_REQUEST`/`NOT_FOUND` calls `notFound()`; rate-limit/upstream failures render scoped empty/error panels. | Invalid routes are 404s; provider failures never become fake market data. |
| CET-229 ships the `lightweight-charts` area island (`price-chart.tsx`) with functional `LIVE/1D/1W/1M/1Y/MAX` tabs fed by `chart.candles`; `ChartPanel` (RSC) just mounts it with the server seed. | Real chart on the Penpot design; the canvas + tab interactivity must be a client island. |
| The swap flow uses base-unit string amounts, default `50` bps slippage, quote before build, confirmation before Privy signing/sending. | Preserves Jupiter amount integrity and user consent; the server never signs. |
| Position P/L remains neutral when cost basis is unknown (`null` from `portfolio.position`). | Real-data rule: no fabricated cost basis or P/L. |

## Decisions

- **No new shared UI primitives for CET-228.** The trading terminal is product-specific, so composites
  stay route-local under `_components`; existing `@fomo/ui` primitives are used for buttons/inputs.
- **CET-229 chart = `lightweight-charts@5.2.0` area series, not candlesticks.** The Penpot `col-mid`
  design is a green area/line sparkline (line `#16e27b`, translucent fill), so the island feeds each
  candle's `close` into an `AreaSeries` (grid/axes hidden, `autoSize`). `lightweight-charts` is
  TradingView's OSS package — satisfies the "TradingView charting library" requirement with no gated
  datafeed adapter. Range tabs map to the router's `interval`/`from`: `LIVE`→`1m`/3h (polls 15s),
  `1D`→`15m`/server-default (matches the seed), `1W`→`1H`/7d, `1M`→`4H`/30d, `1Y`→`1D`/365d,
  `MAX`→`1W`/server-default. The client canvas island has no integration test (interactivity islands
  are client-only); the `chart.candles` contract is covered by `chart.integration.test.ts`.
- **Anonymous wallet state is explicit.** Swap and position islands show sign-in/connect states and
  do not call protected procedures until Privy reports an authenticated user.

## Links

App: [`../../../AGENTS.md`](../../../AGENTS.md) · Routers: [`../../../../../packages/api/src/routers/AGENTS.md`](../../../../../packages/api/src/routers/AGENTS.md) · Swap: [`../../../../../packages/api/src/routers/swap/AGENTS.md`](../../../../../packages/api/src/routers/swap/AGENTS.md)
