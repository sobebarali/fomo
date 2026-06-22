# `holders` router (`holders`)

> Top holders for a token — the trading page's holders tab. Reads BirdEye via
> [`../../integrations/birdeye`](../../integrations/birdeye). Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `list` — top holders for a token
- **Access:** public
- **Input:** `z.object({ address: SolanaMint, limit: z.number().int().min(1).max(100).default(20) })`
- **Output:** `{ items: Array<{ owner: string; amount: number; percentage: number; rank: number }> }` (descending by amount)
- **Errors:** `BAD_REQUEST` (invalid mint) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Sorted descending by amount; `rank` is 1-based and server-assigned. | Stable display order; client doesn't re-rank. |
| `percentage` = `amount / totalSupply * 100`, rounded to **2 decimals** at the boundary, not raw. | One rounding rule; UI shows a consistent %. |
| Supply unknown (`token` null or `totalSupply <= 0`) → `percentage` is `0` (no `NOT_FOUND`). | Holders still render; % is the only field that degrades. |
| Read-through cache per `address` (short TTL — holders drift slowly). | Free-tier safe without staleness that matters. |

## Dependencies

- **Calls:** `birdeye.holders(address, limit)` + `birdeye.token(address)` (for `totalSupply`), issued in
  parallel — both cached in the integration. **Feeds:** trading-page holders tab.

## Hardest invariant — percentages sum sanely

Returned `percentage` values are consistent with `amount`/supply and never exceed 100% in aggregate
for the top set. Test mocks BirdEye holders: ordering, rank assignment, percentage math, 429 → `RATE_LIMITED`.

## Links

Token: [`../tokens/AGENTS.md`](../tokens/AGENTS.md) · BirdEye: [`../../integrations/birdeye/AGENTS.md`](../../integrations/birdeye/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
