# trade (trading page)

> The ChadWallet trading page at `/trade/[address]`. CET-228 implements the Penpot boards
> `03 · Trading — Desktop` and `04 · Trading — Mobile`: dark `#0b0f10`, neon green `#16e27b`,
> red sells `#f6465d`, compact square controls, dense market tables, and desktop top/bottom
> token banners. Parent: [`../../../AGENTS.md`](../../../AGENTS.md).

## Layout

- **Desktop:** top token banner → terminal header/search/balance/auth → 3-column shell → bottom token
  banner. Left = trending rows (`tokens.trending`), middle = token detail/stats/chart/tabs, right =
  buy/sell + position.
- **Mobile:** sticky token header with back/share/watch actions, chart + 1D-active range pills,
  compact stats, `Trades`/`Holders`/`About` tabs, position card, swap panel, and sticky `Sell` /
  `Buy {SYMBOL}` actions.
- Every token reference (banner/list row) routes to `/trade/{address}` and the active row is matched
  by the route `address`.

## Data + boundaries

| Concern | Source | Boundary |
|---------|--------|----------|
| Trending list, token header, initial holders, initial trades, chart | `tokens`/`chart`/`holders`/`trades` | Server Components (cached public reads) |
| Live trade refresh + tab state | `trades.recent` | client island; polls after hydration, seeded by the server result |
| Buy/sell quote + build/sign/send | `swap.quote` → `swap.buildTransaction` → Privy Solana wallet | client island; quote first, confirm before signing |
| Position | `portfolio.position` | protected client island; fetches only after Privy auth |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Static market reads render in RSC; only wallet, polling, and tab interactivity are client islands. | Secrets stay server-side; smaller bundle. |
| `tokens.get` `BAD_REQUEST`/`NOT_FOUND` calls `notFound()`; rate-limit/upstream failures render scoped empty/error panels. | Invalid routes are 404s; provider failures never become fake market data. |
| CET-228 ships a lightweight real-candle SVG shell fed by `chart.candles`; CET-229 owns the full TradingView library and functional range tabs. | Delivers the Penpot structure now without adding a charting dependency prematurely. |
| The swap flow uses base-unit string amounts, default `50` bps slippage, quote before build, confirmation before Privy signing/sending. | Preserves Jupiter amount integrity and user consent; the server never signs. |
| Position P/L remains neutral when cost basis is unknown (`null` from `portfolio.position`). | Real-data rule: no fabricated cost basis or P/L. |

## Decisions

- **No new shared UI primitives for CET-228.** The trading terminal is product-specific, so composites
  stay route-local under `_components`; existing `@fomo/ui` primitives are used for buttons/inputs.
- **No new chart dependency in CET-228.** `chart.candles` renders as a lightweight SVG candle/line
  shell with `1D` visually active. TradingView integration remains the CET-229 contract.
- **Anonymous wallet state is explicit.** Swap and position islands show sign-in/connect states and
  do not call protected procedures until Privy reports an authenticated user.

## Links

App: [`../../../AGENTS.md`](../../../AGENTS.md) · Routers: [`../../../../../packages/api/src/routers/AGENTS.md`](../../../../../packages/api/src/routers/AGENTS.md) · Swap: [`../../../../../packages/api/src/routers/swap/AGENTS.md`](../../../../../packages/api/src/routers/swap/AGENTS.md)
