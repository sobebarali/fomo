# `trades` router (`trades`)

> Recent/live trades for a token — the trading page's trades tab. Reads market data via
> [`../../integrations/market`](../../integrations/market). Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `recent` — latest trades for a token
- **Access:** public
- **Input:** `z.object({ address: SolanaMint, limit: z.number().int().min(1).max(100).default(30) })`
- **Output:** `{ items: Array<{ txHash: string; side: "buy" | "sell"; priceUsd: number; amountToken: number; amountUsd: number; trader: string; time: number }> }` (descending by `time`)
- **Errors:** `BAD_REQUEST` (invalid mint) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Newest first; `side` normalized to `"buy"`/`"sell"`; `time` in UNIX seconds. | Consistent UI (green buys / red sells); no client normalization. |
| Short cache TTL (trades are near-real-time); a future live feed can layer on top. | Free-tier safe now; polling/websocket is an upgrade, not a contract change. |
| `txHash`/`trader` are opaque strings passed through; never fabricated. | Real-data rule — every row is a real on-chain trade. |

## Dependencies

- **Calls:** `market.trades(address, limit)`. **Feeds:** trading-page trades tab.

## Hardest invariant — every row is real

No synthetic trades: each item maps 1:1 to an on-chain trade with a real `txHash`. Test mocks the market client
trades: ordering, side normalization, shape, 429 → `RATE_LIMITED`, malformed → `UPSTREAM_ERROR`.

## Links

Token: [`../tokens/AGENTS.md`](../tokens/AGENTS.md) · Market: [`../../integrations/market/AGENTS.md`](../../integrations/market/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
