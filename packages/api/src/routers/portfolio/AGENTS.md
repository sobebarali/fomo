# `portfolio` router (`portfolio`)

> The signed-in user's SOL + token balances and per-token position (value, cost basis, P/L) — the
> trading page's right-column position card. Balances from Alchemy
> ([`../../integrations/alchemy`](../../integrations/alchemy)); prices from the market sources. Format/errors:
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
- **Output:** `{ address: string; amount: number; valueUsd: number; avgBuyUsd: number | null; pnlUsd: number | null; pnlPct: number | null } | null` — **`null` when the wallet holds no position** (a normal state, not an error; the UI renders an empty position card).
- **Errors:** `UNAUTHORIZED` · `BAD_REQUEST` (invalid mint) · `RATE_LIMITED` · `UPSTREAM_ERROR`.
- **Side effects:** none.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The wallet is the session's Privy address — never a client-supplied address. | A user can only read their own position (else `FORBIDDEN`); no spoofing. |
| A null session wallet is `UNAUTHORIZED`. | A degraded valid session without an embedded Solana wallet cannot answer portfolio procedures honestly. |
| Balances from Alchemy, USD value from the market token detail; combine at the boundary. | Each source owns what it's best at; one place merges them. `market.token()` also carries symbol/logo, so the router avoids a second metadata call. |
| `totalValueUsd` includes native SOL valued through the wrapped-SOL mint (`So11111111111111111111111111111111111111112`). | This matches the universal Solana portfolio convention while keeping raw SOL exposed separately as `solBalance`. |
| Unpriced tokens (`market.token()` returns `null`) are skipped from `tokens[]`. | Spam/unlisted holdings should not fabricate symbols or inflate totals; `totalValueUsd` reflects priced holdings only. |
| `avgBuyUsd`/`pnl*` are `null` when cost basis is unknown (no persisted trade history yet). | Honest nulls beat fabricated P/L (real-data rule); cost-basis tracking is a later, additive feature. |

## Dependencies

- **Calls:** `alchemy.getSolBalance(wallet)`, `alchemy.getTokenBalances(wallet)`, `market.token({ address })`. **Reads:** session wallet (`auth`). **Feeds:** trading-page position card.

## Hardest invariant — own-wallet only, honest P/L

`balances`/`position` resolve strictly from the authenticated session's wallet; P/L fields are `null`
rather than guessed when cost basis is absent. Test: anonymous → `UNAUTHORIZED`; mocked Alchemy+market
→ correct `totalValueUsd`, `null` P/L when no basis; 429 → `RATE_LIMITED`.

## Links

Auth: [`../auth/AGENTS.md`](../auth/AGENTS.md) · Alchemy: [`../../integrations/alchemy/AGENTS.md`](../../integrations/alchemy/AGENTS.md) · Swap: [`../swap/AGENTS.md`](../swap/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
