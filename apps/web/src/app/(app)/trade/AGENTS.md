# trade (trading page)

> The ChadWallet trading page at `/trade/[address]`. CET-228 implements the Penpot boards
> `03 · Trading — Desktop` and `04 · Trading — Mobile`: dark `#0b0f10`, neon green `#16e27b`,
> red sells `#f6465d`, compact square controls, dense market tables, and desktop top/bottom
> token banners. Parent: [`../../../AGENTS.md`](../../../AGENTS.md).

## Layout

- **Desktop:** top token banner → terminal header/search/balance/auth → 3-column shell → bottom token
  banner. Left = trending rows (`tokens.trending`), middle = token detail/stats/chart/tabs, right =
  buy/sell + position.
- **Chrome vs content split:** `layout.tsx` owns the persistent chrome — top/bottom banners, terminal
  header, and the **left trending sidebar** (fetches `tokens.trending` once, preserved across token
  navigations; the sidebar is a client island that highlights the active row via `usePathname`).
  `[address]/page.tsx` renders only the middle + right content for the current token. So clicking a
  token re-renders just that slot (with `loading.tsx` as its fallback), not the whole app.
- **No cache warmer.** A `TokenWarmer` island that continuously pre-loaded every trending token was
  removed: looping ~30 tokens × 4 reads nonstop burned the BirdEye **free-tier compute-unit quota**
  (UPSTREAM_ERROR storm). Instead, switching to a token cold-loads only `tokens.get` (~1 call, then
  served from the SWR cache on revisit) and the panels stream. Re-introduce a *bounded* warmer only
  on a paid BirdEye tier.
- **Mobile:** sticky token header with back/share/watch actions, chart + functional
  `LIVE/1D/1W/1M/1Y/MAX` range tabs (`1D` default), compact stats, `Trades`/`Holders`/`About` tabs,
  position card, swap panel, and sticky `Sell` / `Buy {SYMBOL}` actions.
- Every token reference (banner/list row) routes to `/trade/{address}` and the active row is matched
  by the route `address`.
- `/trade` (no address) is the **dashboard entry**: `page.tsx` redirects to the top trending token
  (fallback wrapped-SOL if trending is unavailable). Signed-in users hitting the landing are sent here
  by the `LandingRedirect` island.

## Data + boundaries

> **Fetch-once, no polling (free-tier CU budget).** BirdEye's free tier is ~30k compute units/month —
> far too little for a live-polling UI — so every surface fetches **once per navigation** and is *not*
> polled. Global TanStack defaults (`utils/orpc.ts`): `refetchOnWindowFocus: false`, `staleTime` 5min
> (revisiting a token in the same session reuses the client cache, zero extra calls). A page reload is
> the manual refresh. Re-enable polling + live updates only on a paid BirdEye tier — see [Decisions].

| Concern | Source | Boundary |
|---------|--------|----------|
| Trending list + top/bottom banners | `tokens.trending` | server-rendered in `layout.tsx` (one cached call, feeds `TrendingSidebar` + both `TokenBanner`s) |
| Token header / stats | `tokens.get` | server-rendered in `[address]/page.tsx` — **the only read it blocks on** (fast nav) |
| Chart render + range-tab refetch | `chart.candles` | client island (`lightweight-charts` area series); self-fetches once per range with a skeleton |
| Holders + trades + tab state | `holders.list` / `trades.recent` | client islands; fetch once on tab activation with a skeleton (no server seed, no poll) |
| Position | `portfolio.position` | protected client island; fetches once after Privy auth |
| Buy/sell quote + build/sign/send | `swap.quote` → `swap.buildTransaction` → Privy Solana wallet | client island; quote first, confirm before signing |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Static market reads render in RSC; only wallet, polling, and tab interactivity are client islands. | Secrets stay server-side; smaller bundle. |
| `tokens.get` `BAD_REQUEST`/`NOT_FOUND` calls `notFound()`; rate-limit/upstream failures render scoped empty/error panels. | Invalid routes are 404s; provider failures never become fake market data. |
| CET-229 ships the `lightweight-charts` area island (`price-chart.tsx`) with functional `LIVE/1D/1W/1M/1Y/MAX` tabs fed by `chart.candles`; `ChartPanel` (RSC) just mounts `<PriceChart address>`, which self-fetches per range with a skeleton (no server seed). | Real chart on the Penpot design; the canvas + tab interactivity must be a client island, and streaming keeps navigation off the chart fetch. |
| The swap flow uses base-unit string amounts, default `50` bps slippage, quote before build, confirmation before Privy signing/sending. | Preserves Jupiter amount integrity and user consent; the server never signs. |
| Position P/L remains neutral when cost basis is unknown (`null` from `portfolio.position`). | Real-data rule: no fabricated cost basis or P/L. |
| `RATE_LIMITED` (BirdEye/Alchemy/Jupiter 429) auto-recovers: client islands retry with capped backoff (global `retry` in `utils/orpc.ts`, no toast); server-rendered panels are nudged by the `RateLimitRefresher` island (`router.refresh()` every 8s while any panel is rate-limited). `loading.tsx` is the fallback for the layout's content slot, so the chrome stays put while the token content spins. | Free-tier limits are transient; the UI fills in once they clear instead of dead-ending. |

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
