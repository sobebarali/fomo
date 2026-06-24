# `_shared` — router building blocks

> Provider-agnostic helpers shared across router modules: cursor pagination plus stable oRPC error
> construction. No integrations, no env. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Files

| File | Owns |
|------|------|
| `errors.ts` | `routerError(code, { message? })` — throws the API taxonomy with explicit HTTP status (`RATE_LIMITED` → 429, `UPSTREAM_ERROR` → 502, etc.). |
| `pagination.ts` | `encodeCursor(offset)` · `decodeCursor(cursor?)` · `paginate(items, limit, offset)` — opaque base64url-offset cursors. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The cursor is an **opaque base64url offset**; clients echo `nextCursor` back, never build one. | One pagination contract; the encoding can evolve without a client change. |
| `decodeCursor` **never throws** — garbage / NaN / negative → `0` (start). | List routers declare only `RATE_LIMITED`/`UPSTREAM_ERROR`; a bad cursor must degrade to page one, not 500. |
| Routers use `routerError(...)` for domain errors instead of raw `new ORPCError(...)`. | HTTP status stays aligned with the taxonomy, so `RATE_LIMITED` is not emitted as a 500. |
| `nextCursor` is null once a page returns `< limit`. | Upstream gives no reliable total; a short page is the end signal. |
| The cursor carries offset only — `sort`/filters ride on the input each call. | No input↔cursor contradiction to define. |

## Testing

`pagination.test.ts` is the canonical cursor unit test (cursor round-trip + garbage→0 + `nextCursor`
math); router integration tests assert stable error codes/status through the surface.

## Links

Parent: [`../AGENTS.md`](../AGENTS.md) · Reference list router: [`../tokens/AGENTS.md`](../tokens/AGENTS.md)
