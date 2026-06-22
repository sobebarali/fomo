# `portfolio` router (`portfolio`)

> The signed-in user's SOL + token balances and per-token position (value, cost basis, P/L) — the
> trading page's right-column position card. Balances from Alchemy
> ([`../../integrations/alchemy`](../../integrations/alchemy)); prices from BirdEye. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `balances` — the user's holdings
- **Access:** protected
- **Input:** none (wallet comes from the session's Privy wallet address)
- **Output:** `{ solBalance: number; tokens: Array<{ address: string; symbol: string; logoUri: string | null; amount: number; priceUsd: number; valueUsd: number }>; totalValueUsd: number }`
- **Errors:** `UNAUTHORIZED` · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

### `position` — the user's position in one token
- **Access:** protected
- **Input:** `z.object({ address: SolanaMint })`
- **Output:** `{ address: string; amount: number; valueUsd: number; avgBuyUsd: number | null; pnlUsd: number | null; pnlPct: number | null }`
- **Errors:** `UNAUTHORIZED` · `NOT_FOUND` (no position) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The wallet is the session's Privy address — never a client-supplied address. | A user can only read their own position (else `FORBIDDEN`); no spoofing. |
| Balances from Alchemy, USD value from BirdEye prices; combine at the boundary. | Each source owns what it's best at; one place merges them. |
| `avgBuyUsd`/`pnl*` are `null` when cost basis is unknown (no persisted trade history yet). | Honest nulls beat fabricated P/L (real-data rule); cost-basis tracking is a later, additive feature. |

## Dependencies

- **Calls:** `alchemy.getTokenBalances(wallet)`, `birdeye` prices, `tokens` metadata. **Reads:** session wallet (`auth`). **Feeds:** trading-page position card.

## Hardest invariant — own-wallet only, honest P/L

`balances`/`position` resolve strictly from the authenticated session's wallet; P/L fields are `null`
rather than guessed when cost basis is absent. Test: anonymous → `UNAUTHORIZED`; mocked Alchemy+BirdEye
→ correct `totalValueUsd`, `null` P/L when no basis; 429 → `RATE_LIMITED`.

## Links

Auth: [`../auth/AGENTS.md`](../auth/AGENTS.md) · Alchemy: [`../../integrations/alchemy/AGENTS.md`](../../integrations/alchemy/AGENTS.md) · Swap: [`../swap/AGENTS.md`](../swap/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
