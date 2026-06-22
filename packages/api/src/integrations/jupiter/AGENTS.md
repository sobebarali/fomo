# `jupiter` integration

> Server-side **Jupiter Swap V2** client — swap quotes + unsigned swap-transaction building for `swap`.
> Never signs (Privy signs client-side). The mocked edge in tests. Format/errors:
> [`../../../AGENTS.md`](../../../AGENTS.md).

- **Base URL:** `https://api.jup.ag` (Swap **V2**). **Auth:** optional `x-api-key: env.JUPITER_API_KEY`
  (server-only). Keyless works at ~**0.5 RPS** (testing/prototyping); a key raises the tier.

## Surface

Every method takes a single **destructured object** arg.

| Method | Returns | Used by |
|--------|---------|---------|
| `quote({ inputMint, outputMint, amount, slippageBps })` | `Quote` — `{ inAmount, outAmount, otherAmountThreshold, priceImpactPct, slippageBps, routePlan: [{ label, percent }] }` (amounts are base-unit strings) | `swap.quote` |
| `swapTransaction({ inputMint, outputMint, amount, slippageBps, userPublicKey })` | `{ swapTransaction: string; requestId: string }` (base64 **unsigned** tx) | `swap.buildTransaction` |

Both call **one** endpoint — `GET /swap/v2/order`. Without `taker` it returns a quote; **with**
`taker` (= `userPublicKey`) it also returns an unsigned `transaction` + `requestId`. (Landing the
signed tx via `POST /swap/v2/execute` is the swap router's job — out of scope here.)

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Amounts in/out are base-unit **strings**, passed through untouched. | A JS-number round-trip silently corrupts large token amounts. |
| Returns an **unsigned** transaction only — signing is client-side via Privy. | The server never holds private keys (root domain rule). |
| No route / non-2xx / empty `transaction`+`errorCode` → `UpstreamError` (→ `UPSTREAM_ERROR`); `429` → `RateLimitError` (→ `RATE_LIMITED`). | Illiquid tokens & insufficient funds shouldn't 500; stable codes. |
| Key from `@fomo/env/server` only, in the `x-api-key` header; never in a URL, log, or error message. | Root domain rule — secrets never reach the browser. |
| Injectable `fetch` for tests. | Mock without the network. |

## Implementation (CET-216)

`createJupiterClient(options?)` → the client; `jupiter` is the shared singleton routers import (one
cache, one limiter, key from `@fomo/env/server`). Options (all optional): `fetch` (default global —
the test seam), `apiKey` (default `env.JUPITER_API_KEY`; omit for the keyless tier), `baseUrl`,
`requestsPerSecond` (default 10 — set **0.5** for keyless), `cacheMax` (default 500). Infra
(cache/limiter/errors/parse) comes from [`../_shared/`](../_shared/AGENTS.md).

**Decisions (Rule 16):**
- **Swap V2, not V1/Metis** — Jupiter's docs flag V1 as deprecated/superseded. V2 fuses quote + build
  into `GET /swap/v2/order` (no V1-style "build from a stored `quoteResponse`"); so `swapTransaction`
  takes the swap params + `userPublicKey` and re-orders with `taker` rather than reusing a quote object.
- **GET-only transport** — both methods are `GET /order` for this issue; `POST /swap/v2/execute`
  (landing) is deferred to the swap router (CET-224), which also consumes `requestId`.
- **`requestId` returned** from `swapTransaction` now (cheap, forward-looking for `/execute`).

**Endpoint + per-method cache TTL** (real payloads captured into `__fixtures__/`):

| Method | call | Cache |
|--------|------|-------|
| `quote` | `GET /swap/v2/order?inputMint=&outputMint=&amount=&slippageBps=` | 5s (quotes go stale fast) |
| `swapTransaction` | `GET /swap/v2/order?…&taker=` | **uncached** (tx is taker-specific + blockhash-expiring) |

`429` → `RateLimitError`; any other non-2xx, transport failure, invalid JSON, no-route (`errorCode` /
missing `outAmount`), or empty-`transaction`+`errorCode` → `UpstreamError` (messages carry no key).

**File layout — one function per file (feature-colocated).**

| File | Owns |
|------|------|
| `index.ts` | `createJupiterClient(opts)` (wires every method) + the `jupiter` singleton. |
| `context.ts` | `createContext(opts) → { request, cache }` + `JupiterClientOptions` — builds the limiter, requester, and cache **once**. `BASE_URL = "https://api.jup.ag"` (host only; paths carry `/swap/v2/…`). |
| `request.ts` | shared GET transport: rate-limit → `fetch` (optional `x-api-key`) → status/JSON error mapping; returns raw JSON (each method Zod-validates). |
| `schema.ts` | view types `Quote` / `RoutePlanStep` / `SwapTxResult` + the lenient raw `OrderResponse` Zod schema (both methods parse it). |
| `methods/quote.ts` · `methods/swap-transaction.ts` | one method each — `makeX(ctx)` factory + normalizer + TTL colocated. |
| `__fixtures__/order-quote.json` · `order-tx.json` | real `GET /swap/v2/order` payloads (no-taker / with-taker) the method tests assert against. |
| `../_shared/` | `cache.ts` · `limiter.ts` · `errors.ts` · `parse.ts` — provider-agnostic infra shared by every integration. |

## Testing

- `swap` tests **mock this client** (quote shape, base-unit strings, unsigned tx, no-route error).
- `methods/*.test.ts` assert normalization against the real `__fixtures__/` payloads (stubbed `fetch`,
  offline). `request.test.ts` covers error mapping, `x-api-key` presence/absence, and key-safety.
- **Fixtures are REAL** — captured from the live Jupiter V2 API (re-capture if the shape drifts).
- Opt-in `jupiter.smoke.ts` quotes a real SOL→USDC route + builds an unsigned tx out-of-band (keyless,
  no secret needed): `bun run packages/api/src/integrations/jupiter/jupiter.smoke.ts`.

## Links

Swap: [`../../routers/swap/AGENTS.md`](../../routers/swap/AGENTS.md) · Shared infra:
[`../_shared/AGENTS.md`](../_shared/AGENTS.md) · Env: [`../../../../env/AGENTS.md`](../../../../env/AGENTS.md) ·
API: [`../../../AGENTS.md`](../../../AGENTS.md)
