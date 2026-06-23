# `chart` router (`chart`)

> OHLCV candles for a token + interval — feeds the TradingView chart on the trading page. Reads
> market data via [`../../integrations/market`](../../integrations/market). Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `candles` — OHLCV series for a token/interval/range
- **Access:** public
- **Input:** `z.object({ address: SolanaMint, interval: z.enum(["1m","5m","15m","1H","4H","1D","1W"]).default("15m"), from: z.number().int().optional(), to: z.number().int().optional() })`
- **Output:** `{ candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> }` (ascending by `time`)
- **Errors:** `NOT_FOUND` (no series for mint) · `BAD_REQUEST` (invalid mint / `from > to`) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none (cached read-through in the integration).

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Candles ascending by `time`, `time` in UNIX seconds (TradingView's expected shape). | The client charting lib consumes this directly; no client-side re-sort. |
| Cache per `(address, interval)`; the latest (open) candle is short-TTL, closed candles long-TTL. | Closed candles never change — caching them hard keeps us inside the free-tier limits. |
| Default a sane range when `from`/`to` omitted; reject `from > to` as `BAD_REQUEST`. | Predictable payloads; bad ranges fail fast, not upstream. |

## Dependencies

- **Calls:** `market.ohlcv(address, interval, range)`. **Feeds:** the trading-page price chart (TradingView).

## Hardest invariant — chart matches price

The latest candle's `close` must track the same market price `tokens.get` reports (same source), so
the chart and the headline price never disagree. Test mocks the market client OHLCV: shape + ascending order +
429 → `RATE_LIMITED` + invalid range → `BAD_REQUEST`.

## Links

Token: [`../tokens/AGENTS.md`](../tokens/AGENTS.md) · Market: [`../../integrations/market/AGENTS.md`](../../integrations/market/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
