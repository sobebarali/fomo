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
- **Bounded warming, not blanket warming.** A `TokenWarmer` island that continuously pre-loaded every
  trending token was removed: looping ~30 tokens × 4 reads nonstop burned the BirdEye **free-tier
  compute-unit quota** (UPSTREAM_ERROR storm). The server poller now warms only the top five trending
  tokens' default 1D chart + 20 recent trades at most once per minute while SSE clients exist; the
  sidebar itself still does only same-token TanStack cache seeding from the clicked/focused/hovered
  trending row. Trending-row data may render as a same-token preview placeholder while the full
  `tokens.get` result/SSE update catches up; never show previous-token trades or charts under a new
  active token.
- **Mobile:** sticky token header with back/share/watch actions, chart + functional
  `LIVE/1D/1W/1M/1Y/MAX` range tabs (`1D` default), compact stats, `Trades`/`Holders`/`About` tabs,
  position card, swap panel, and sticky `Sell` / `Buy {SYMBOL}` actions.
- Every token reference (banner/list row) routes to `/trade/{address}` and the active row is matched
  by the route `address`.
- `/trade` (no address) is the **dashboard entry**: `page.tsx` redirects to the top trending token
  (fallback wrapped-SOL if trending is unavailable). Signed-in users hitting the landing are sent here
  by the `LandingRedirect` island.

## Data + boundaries

> **Live: poll baseline + SSE accelerator, free sources.** Reads come from **free, non-CU** providers
> (the [`market`](../../../../../packages/api/src/integrations/market/AGENTS.md) facade: BirdEye first,
> then GeckoTerminal / DexScreener / Alchemy fallbacks). Client islands are **SSE-first** for live
> token/trending updates with slower polling as a fallback. The poller (`src/server/market-poller.ts`,
> started from `instrumentation.ts`) refreshes trending + active token headers every 30s, warms only the
> top five trending tokens' default chart/trades cache every 60s, and pushes over
> **SSE** (`/api/stream`, hub `src/server/sse-hub.ts`); one client `EventSource` (`MarketStream`, mounted in
> the trade layout) writes each push into the TanStack cache. Chart/trades/holders stay client-initiated
> so background SSE work does not starve active reads in the shared provider limiter. **Railway's edge proxy buffers SSE
> intermittently** (a 2KB padding comment + `x-accel-buffering: no` help but aren't fully reliable), so
> each streamed surface keeps a slow poll as the recovery path. Either way it's rate-safe: the
> server's required Redis stale-while-revalidate cache dedups upstream to ~1 per TTL per key
> regardless of client count. Global TanStack defaults (`utils/orpc.ts`): `refetchOnWindowFocus: false`,
> `staleTime` 5min and finite `RATE_LIMITED` retries with capped backoff.

| Concern | Source | Boundary |
|---------|--------|----------|
| Trending list + top/bottom banners | `tokens.trending` | server-seeded in `layout.tsx`; `TrendingSidebar` + `LiveTokenBanner` share the `["trending"]` query (SSE + 120s fallback poll) |
| Token header / stats | `tokens.get` | server-rendered quick seed only (1.2s cap, then render preview/client state); `token-live.tsx` wrappers seed from it or same-token trending preview, SSE + 60s fallback poll (`["token", address]`) |
| Chart render + range-tab refetch | `chart.candles` | client island; self-fetches per range with interval-rounded windows, dynamically loads `lightweight-charts`, default `1D` asks for 24h, `LIVE` polls 30s (not on SSE); after 4s with no data it shows a syncing/retry panel instead of an indefinite skeleton |
| Holders + trades + tab state | `holders.list` / `trades.recent` | client islands; fetch on tab activation with a skeleton. Trades request 20 rows and poll 60s; holders poll 120s (neither is on SSE); trades also show a syncing/retry panel after 4s with no rows |
| Position | `portfolio.position` | protected client island; polls 20s after Privy auth (per-user, not on SSE) |
| Buy/sell quote + build/sign/send | `swap.quote` → `swap.buildTransaction` → Privy Solana wallet | client island; quote first, confirm before signing; buy input accepts human SOL and converts to lamports before calling `swap` |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Static market reads render in RSC; only wallet, polling, and tab interactivity are client islands. | Secrets stay server-side; smaller bundle. |
| `tokens.get` `BAD_REQUEST`/`NOT_FOUND` calls `notFound()`; rate-limit/upstream failures render scoped empty/error panels. | Invalid routes are 404s; provider failures never become fake market data. |
| CET-229 ships the `lightweight-charts` area island (`price-chart.tsx` + lazy `price-chart-canvas.tsx`) with functional `LIVE/1D/1W/1M/1Y/MAX` tabs fed by `chart.candles`; `ChartPanel` (RSC) just mounts `<PriceChart address>`, which self-fetches per range with a skeleton (no server seed). | Real chart on the Penpot design; the canvas + tab interactivity must be a client island, and the heavy chart library stays out of the initial trade shell. |
| The swap flow sends base-unit string amounts to `swap`, default `50` bps slippage, quote before build, confirmation before Privy signing/sending. Buy UI accepts human SOL (for example `0.0001`) and converts to lamports client-side; sell UI stays token base units until token decimals are available. | Preserves Jupiter amount integrity and user consent; the server never signs. |
| Position P/L remains neutral when cost basis is unknown (`null` from `portfolio.position`). | Real-data rule: no fabricated cost basis or P/L. |
| `RATE_LIMITED` (provider 429) auto-recovers: the global TanStack `retry` (`utils/orpc.ts`) retries it a finite number of times with capped backoff and no toast; SSE-fed surfaces self-heal on the next poll push. `loading.tsx` is the fallback for the layout's content slot, so the chrome stays put while the token content spins. (The old `RateLimitRefresher` `router.refresh()` island was retired once SSE landed.) | Free-tier limits are transient; the UI fills in once they clear without polling forever. |

## Decisions

- **No new shared UI primitives for CET-228.** The trading terminal is product-specific, so composites
  stay route-local under `_components`; existing `@fomo/ui` primitives are used for buttons/inputs.
- **CET-229 chart = `lightweight-charts@5.2.0` area series, not candlesticks.** The Penpot `col-mid`
  design is a green area/line sparkline (line `#16e27b`, translucent fill), so the island feeds each
  candle's `close` into an `AreaSeries` (grid/axes hidden, `autoSize`). `lightweight-charts` is
  TradingView's OSS package — satisfies the "TradingView charting library" requirement with no gated
  datafeed adapter. Range tabs map to the router's `interval`/`from`: `LIVE`→`1m`/3h (polls 30s),
  `1D`→`15m`/server-default (matches the seed), `1W`→`1H`/7d, `1M`→`4H`/30d, `1Y`→`1D`/365d,
  `MAX`→`1W`/server-default. The default `1D` window is explicitly 24h so prod cold loads do not ask
  the router for the heavier 300-candle fallback. The client canvas island has no integration test (interactivity islands
  are client-only); the `chart.candles` contract is covered by `chart.integration.test.ts`.
- **Anonymous wallet state is explicit.** Swap and position islands show sign-in/connect states and
  do not call protected procedures until Privy reports an authenticated user.
- **Intent preview + bounded top-token warming, not list-wide warming.** Row `pointerenter` / `focus`
  / `pointerdown` seeds `["token", address]` from the same trending row only; it does not issue
  provider reads. The server poller warms only top-five default chart/trades keys once per minute
  while clients are connected. This makes common navigation paint with stale-but-same-token data while
  avoiding duplicate `tokens.get` calls that can queue behind the provider limiter and keep
  `/trade/[address]` in `loading.tsx`.

## Links

App: [`../../../AGENTS.md`](../../../AGENTS.md) · Routers: [`../../../../../packages/api/src/routers/AGENTS.md`](../../../../../packages/api/src/routers/AGENTS.md) · Swap: [`../../../../../packages/api/src/routers/swap/AGENTS.md`](../../../../../packages/api/src/routers/swap/AGENTS.md)
