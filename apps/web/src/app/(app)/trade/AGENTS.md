# trade (trading page)

> The 3-column trading page (dark + neon green — see the Penpot design), at `/trade/[address]`.
> Composes the market-data routers + the buy/sell flow. Parent: [`../../../AGENTS.md`](../../../AGENTS.md).

## Layout

- **Left:** trending tokens list (`tokens.trending`) — selecting one navigates to its `[address]`.
- **Middle:** token header (`tokens.get`) · price chart (`chart.candles` via TradingView) · tabs for
  holders (`holders.list`) + live trades (`trades.recent`).
- **Right:** buy/sell panel (`swap.quote` → `swap.buildTransaction` → **sign client-side via Privy**) +
  the user's position (`portfolio.position`).

## Data + boundaries

| Concern | Source | Boundary |
|---------|--------|----------|
| Trending list, token header, holders, trades, chart | `tokens`/`chart`/`holders`/`trades` | Server Components (cached reads) |
| Buy/sell quote + build | `swap` | client island (needs the user's pubkey + Privy signing) |
| Position | `portfolio` | protected; client/server with the session wallet |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Static reads render in RSC; only the buy/sell panel + live trades are client islands. | Secrets stay server-side; smaller bundle. |
| The swap flow surfaces slippage and confirms before the user signs; the server returns an **unsigned** tx. | The server never signs (root domain rule); user consents to slippage. |
| TradingView consumes `chart.candles` as-is (ascending, UNIX-seconds OHLCV). | Contract matches the chart router; no client reshape. |
| Every token reference (banner, list row) routes by `address` to this page. | One canonical token route. |

## Links

App: [`../../../AGENTS.md`](../../../AGENTS.md) · Routers: [`../../../../../packages/api/src/routers/AGENTS.md`](../../../../../packages/api/src/routers/AGENTS.md) · Swap: [`../../../../../packages/api/src/routers/swap/AGENTS.md`](../../../../../packages/api/src/routers/swap/AGENTS.md)
