# `_shared` — integration infra

> Provider-agnostic building blocks every `integrations/*` client reuses: a bounded TTL cache, a
> token-bucket rate-limiter, the tagged error vocabulary, and the Zod→error funnel. No provider names,
> no env, no `fetch` — pure utilities. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Files

| File | Owns |
|------|------|
| `cache.ts` | `createCache(max) → Cache` — bounded **stale-while-revalidate** TTL cache (FIFO-evict at `max`): a fresh hit returns instantly, a stale hit returns the old value AND refreshes in the background (caller never blocks on a refetch), a cold miss blocks once; concurrent producers per key are deduped; a hit takes no rate-limit token. |
| `limiter.ts` | `createLimiter(rps) → Limiter` — in-memory token bucket; per-instance (adequate for Vercel serverless). |
| `errors.ts` | `RateLimitError` (→ `RATE_LIMITED`) · `UpstreamError` (→ `UPSTREAM_ERROR`) · `BadRequestError` (→ `BAD_REQUEST`; its message **is** surfaced to the user — for a request the upstream rejects as unfulfillable, e.g. "Insufficient funds"). **Never carry an API key**. |
| `parse.ts` | `parseData(schema, data)` — Zod `safeParse`; a failure becomes `UpstreamError`. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Integrations import infra from here, not from a sibling. | One copy — birdeye/alchemy/jupiter were byte-identical; extracted on the 3rd integration. |
| Stays provider-agnostic — no provider names, env, or transport. | Reusable by every client; the transport/env lives in each integration's `context.ts`/`request.ts`. |
| Tests assert error **type/code**, never message strings. | Generic default messages are free to change; codes are the contract. |

## Testing

`cache.test.ts` + `limiter.test.ts` are the canonical infra tests (integrations don't re-test them).
`errors`/`parse` are exercised through each integration's `request.test.ts` (error mapping + key-safety).

## Links

API: [`../../AGENTS.md`](../../AGENTS.md) · birdeye: [`../birdeye/AGENTS.md`](../birdeye/AGENTS.md) ·
alchemy: [`../alchemy/AGENTS.md`](../alchemy/AGENTS.md) · jupiter: [`../jupiter/AGENTS.md`](../jupiter/AGENTS.md)
