# `swap` router (`swap`)

> Buy/sell a token through **Jupiter**: a price quote + the unsigned transaction the client signs via
> Privy. The server NEVER signs — it only quotes and builds. Reads
> [`../../integrations/jupiter`](../../integrations/jupiter). Format/errors: [`../../../AGENTS.md`](../../../AGENTS.md).

## Procedures

### `quote` — price a buy or sell
- **Access:** public
- **Input:** `z.object({ inputMint: SolanaMint, outputMint: SolanaMint, amount: z.string(), slippageBps: z.number().int().min(1).max(5000).default(50) })` (`amount` = base-unit string to avoid float loss)
- **Output:** `{ inAmount: string; outAmount: string; priceImpactPct: number; slippageBps: number; routePlan: Array<{ label: string; percent: number }>; quoteId: string }`
- **Errors:** `BAD_REQUEST` (invalid mint/amount) · `UPSTREAM_ERROR` (no route / Jupiter down) · `RATE_LIMITED`.
- **Side effects:** none.

### `buildTransaction` — the unsigned swap tx for the user to sign
- **Access:** protected
- **Input:** `z.object({ quoteId: z.string(), userPublicKey: SolanaAddress })`
- **Output:** `{ swapTransaction: string }` (base64 unsigned tx; client signs with Privy + submits)
- **Errors:** `UNAUTHORIZED` · `BAD_REQUEST` (stale/unknown `quoteId`) · `UPSTREAM_ERROR`.
- **Side effects:** none on our DB; Jupiter builds the tx. The user's wallet executes it client-side.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Amounts are base-unit **strings**, never JS numbers. | Token amounts exceed `Number.MAX_SAFE_INTEGER`; a float silently corrupts the trade. |
| `slippageBps` is explicit + surfaced to the UI; default 0.5%. | The user must see/confirm slippage before signing (root domain rule). |
| The server returns an **unsigned** tx only; signing is client-side via Privy. | The server never holds private keys (root domain rule). |
| Map "no route found" and Jupiter failures to `UPSTREAM_ERROR`; invalid input to `BAD_REQUEST`. | Stable codes; a thin illiquid token shouldn't 500. |

## Dependencies

- **Calls:** `jupiter.quote(...)`, `jupiter.swapTransaction(...)` ([`../../integrations/jupiter`](../../integrations/jupiter)). **Feeds:** trading-page buy/sell panel.

## Hardest invariant — quote integrity, no server signing

`buildTransaction` produces a tx that matches the `quote` it references (same amounts/slippage) and is
**unsigned** — there is no code path where the server signs or holds a key. Test mocks the Jupiter
client: quote shape, base-unit strings preserved, unsigned tx returned, no-route → `UPSTREAM_ERROR`,
anonymous `buildTransaction` → `UNAUTHORIZED`.

## Links

Jupiter: [`../../integrations/jupiter/AGENTS.md`](../../integrations/jupiter/AGENTS.md) ·
Portfolio: [`../portfolio/AGENTS.md`](../portfolio/AGENTS.md) · Tree: [`../AGENTS.md`](../AGENTS.md)
