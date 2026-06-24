# `_shared` — integration infra

> Provider-agnostic building blocks every `integrations/*` client reuses: Redis-backed TTL caches,
> Redis-backed token-bucket rate-limiters, the tagged error vocabulary, and the
> Zod→error funnel. No provider names, no env, no `fetch` — pure utilities. Format/errors:
> [`../../AGENTS.md`](../../AGENTS.md).

## Files

| File | Owns |
|------|------|
| `cache.ts` | `createCache(max) → Cache` — legacy in-memory SWR cache used only by isolated tests/Privy-local caching, not market provider reads. |
| `limiter.ts` | `createLimiter(rps) → Limiter` — legacy in-memory limiter used only by isolated tests, not market provider reads. |
| `redis.ts` | `createRedisClient(url, token)` · `createRedisCache(redis, { prefix })` · `createRedisLimiter(redis, { prefix, requestsPerSecond })` — required Upstash-backed shared cache/rate limiter for market provider reads. |
| `errors.ts` | `RateLimitError` (→ `RATE_LIMITED`) · `UpstreamError` (→ `UPSTREAM_ERROR`) · `BadRequestError` (→ `BAD_REQUEST`; its message **is** surfaced to the user — for a request the upstream rejects as unfulfillable, e.g. "Insufficient funds"). **Never carry an API key**. |
| `parse.ts` | `parseData(schema, data)` — Zod `safeParse`; a failure becomes `UpstreamError`. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Integrations import infra from here, not from a sibling. | One copy — birdeye/alchemy/jupiter were byte-identical; extracted on the 3rd integration. |
| Stays provider-agnostic — no provider names, env, or transport. | Reusable by every client; the transport/env lives in each integration's `context.ts`/`request.ts`. |
| Redis cache stores a soft `freshUntil` plus a Redis expiry; stale hits return immediately and refresh in the background. | Multi-instance deployments keep SWR behavior while preventing cold-start stampedes. |
| Redis limiter waits until a token is available instead of rejecting before the upstream call. | Provider 429s still map to `RATE_LIMITED`; our own queueing should reduce those 429s, not surface a new error code. |
| Tests assert error **type/code**, never message strings. | Generic default messages are free to change; codes are the contract. |

## Testing

`cache.test.ts` + `limiter.test.ts` + `redis.test.ts` are the canonical infra tests (integrations don't re-test them).
`errors`/`parse` are exercised through each integration's `request.test.ts` (error mapping + key-safety).

## Links

API: [`../../AGENTS.md`](../../AGENTS.md) · birdeye: [`../birdeye/AGENTS.md`](../birdeye/AGENTS.md) ·
alchemy: [`../alchemy/AGENTS.md`](../alchemy/AGENTS.md) · jupiter: [`../jupiter/AGENTS.md`](../jupiter/AGENTS.md)
