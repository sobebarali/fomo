# `alchemy` integration

> Server-side **Alchemy** Solana RPC client — wallet SOL + SPL token balances for `portfolio`. Owns the
> RPC URL (with key) and request batching. The mocked edge in tests. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

- **Endpoint:** `env.ALCHEMY_RPC_URL` (server-only; key embedded in the URL).

## Surface

| Method | Returns | Used by |
|--------|---------|---------|
| `getSolBalance(wallet)` | `number` (SOL) | `portfolio.balances` |
| `getTokenBalances(wallet)` | `Array<{ address: string; amount: number; decimals: number }>` | `portfolio.balances`, `portfolio.position` |
| `holders({ address, limit })` | `Holder[]` (owner + amount) | `market.holders` → `holders.list` |
| `getTokenSupply({ address })` | `number` (uiAmount) | `market.token` (fills `totalSupply`) + holders `%` |

`holders` = `getTokenLargestAccounts` (top 20 token accounts) → batched `getMultipleAccounts`
(jsonParsed) to resolve each account's **owner** wallet (capped at 20, the RPC limit). `getTokenSupply`
backs the supply DexScreener can't provide.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| RPC URL/key from `@fomo/env/server` only; never client-side. | Root domain rule — secrets never reach the browser. |
| Normalize lamports/base-units → human amounts using on-chain decimals at the edge. | Routers/UI get consistent numbers; one normalization point. |
| Map RPC `429`/limit → `RateLimitError`, other failures → `UpstreamError` (→ `RATE_LIMITED`/`UPSTREAM_ERROR`). | Stable codes; an RPC blip isn't a 500. |
| Injectable `fetch`/transport for tests. | Mock without hitting the network. |

## Implementation (CET-215)

`createAlchemyClient(options?)` → the client; `alchemy` is the shared singleton routers import (one
Redis cache, one Redis limiter, URL from `@fomo/env/server`). Options: `fetch` (default global —
the test seam), `rpcUrl` (default `env.ALCHEMY_RPC_URL`), `requestsPerSecond` (default **25** — the free
tier's ~500 CU/s ceiling for our ~10-CU calls; raise on a paid plan), plus `cache`/`limiter` test seams
for offline method tests. [`_shared/errors.ts`](../_shared/AGENTS.md) exports `RateLimitError` /
`UpstreamError` for routers to `instanceof`-map; the `TokenBalance` view type lives in `schema.ts`.

Mirrors the **`birdeye/`** reference shape — cache / limiter / Redis / errors / parse are the provider-agnostic
[`_shared/`](../_shared/AGENTS.md) infra. The one real divergence: Alchemy is **JSON-RPC over POST**
(key embedded in `rpcUrl`), so `request.ts` POSTs `{ jsonrpc, id, method, params }` and validates the
`{ result?, error? }` envelope (`schema.ts` `RpcResponse`); each method then validates `result` with
its own schema via `parseData`.

**RPC methods + per-method cache TTL** (response shapes captured from the live API into `__fixtures__/`):

| Method | RPC call | Normalization | TTL |
|--------|----------|---------------|-----|
| `getSolBalance(wallet)` | `getBalance [wallet]` | `result.value / 1e9` (lamports → SOL) | 10s |
| `getTokenBalances(wallet)` | `getTokenAccountsByOwner [wallet, { programId }, { encoding: "jsonParsed" }]` | `info.mint` + `tokenAmount.uiAmount` (fallback `amount / 10^decimals`) + `decimals` | 10s |

`429` → `RateLimitError`; any other non-2xx, transport failure, invalid JSON, JSON-RPC `error`, or
Zod-parse failure → `UpstreamError` (messages carry no URL/key).

**Decisions (Rule 16):**
- **Classic SPL Token program only** (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`) — pump.fun /
  memecoins are classic SPL. Token-2022 needs a 2nd `getTokenAccountsByOwner` call (the Token-2022
  program id) merged in; deferred (`// ponytail:` in `token-balances.ts`).
- **Infra extracted to [`_shared/`](../_shared/AGENTS.md)** (cache/limiter/Redis/errors/parse) on the 3rd
  integration (jupiter), as this note originally planned — birdeye + alchemy now import it.
- **No `cache`/`limiter` unit tests** here — canonical copies live in `_shared/`.

## Testing

`portfolio` tests mock this client. The client's own decimal-normalization + error mapping get a unit
test with a stubbed transport (`methods/*.test.ts` against real `__fixtures__/` payloads,
`request.test.ts` for error mapping + URL/key-safety; helpers in `test-helpers.ts`). Opt-in
`alchemy.smoke.ts` checks the live RPC out-of-band.

## Links

Portfolio: [`../../routers/portfolio/AGENTS.md`](../../routers/portfolio/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) · API: [`../../../AGENTS.md`](../../../AGENTS.md)
