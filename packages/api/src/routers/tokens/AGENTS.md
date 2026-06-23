# `tokens` router (`tokens`)

> Trending memecoin list + single-token detail, powering the landing banners and the trading page's
> left column + header. Reads market data through [`../../integrations/market`](../../integrations/market)
> (cached + rate-limited). **Reference router** — copy this folder's shape for new routers. Contract
> format + error codes: [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `trending` — the trending tokens list (cursor-paginated)
- **Access:** public
- **Input:** `z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).default(20), sort: z.enum(["trending","gainers","new"]).default("trending") })`
- **Output:** `{ items: Array<TokenSummary>; nextCursor: string | null }` where `TokenSummary = { address: string; symbol: string; name: string; logoUri: string | null; priceUsd: number; change24h: number; volume24h: number; marketCap: number }`
- **Errors:** `RATE_LIMITED` (free-tier limit) · `UPSTREAM_ERROR` (provider down/malformed).
- **Side effects:** none (read-through cache in the integration).

### `get` — one token's detail
- **Access:** public
- **Input:** `z.object({ address: SolanaMint })` (`SolanaMint` = base58 mint, validated in `schema.ts`).
- **Output:** `TokenDetail` = `TokenSummary` + `{ liquidity: number; holders: number; totalSupply: number; description: string | null; links: { website?: string; twitter?: string } }`
- **Errors:** `NOT_FOUND` (unknown/unindexed mint) · `BAD_REQUEST` (invalid mint) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| All market data comes from the `market` facade (cached there), never `fetch` in the handler. | One cache + rate-limiter; free-tier safe; the handler stays a thin map (root domain rules). |
| Validate the mint with `SolanaMint` (Zod) before any upstream call. | Reject garbage at the boundary → `BAD_REQUEST`, not an `UPSTREAM_ERROR` round-trip. |
| Map an upstream 429 → `RATE_LIMITED`, any other failure/malformed payload → `UPSTREAM_ERROR`. | Stable codes for the client + tests; never leak a raw 500. |
| `trending` is cursor-paginated via the shared `_shared/pagination` helper. | One pagination contract across list routers. |
| `TokenSummary`/`TokenDetail` views + serializers live in `schema.ts` (or `src/schemas/token.ts` once a 2nd router needs them). | DB/provider-free, testable serializers; no shape drift. |

## Dependencies

- **Calls:** `market.trending()`, `market.token(address)` ([`../../integrations/market`](../../integrations/market)).
- **Feeds:** landing rotating banners, trading-page trending list + token header. `chart`/`holders`/`trades` take the same `address`.

## Hardest invariant — real data, gracefully degraded

The list/detail must reflect **live** market data (no hardcoded tokens), yet a free-tier rate-limit
or upstream blip must surface as `RATE_LIMITED`/`UPSTREAM_ERROR` — never a fake row and never a 500.
The integration test mocks the `market` client to assert: happy path shape, 429 → `RATE_LIMITED`,
malformed payload → `UPSTREAM_ERROR`, invalid mint → `BAD_REQUEST`, stable cursor paging.

## Links

Integration: [`../../integrations/market/AGENTS.md`](../../integrations/market/AGENTS.md) ·
Chart: [`../chart/AGENTS.md`](../chart/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md) ·
Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md)
