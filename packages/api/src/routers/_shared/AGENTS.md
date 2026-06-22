# `_shared` — router building blocks

> Provider-agnostic helpers shared across router modules. Currently just **cursor pagination** — the
> one contract every list router (`tokens`, future feeds) uses. No oRPC, no integrations, no env: pure
> functions. Format/errors: [`../../AGENTS.md`](../../AGENTS.md).

## Files

| File | Owns |
|------|------|
| `pagination.ts` | `encodeCursor(offset)` · `decodeCursor(cursor?)` · `paginate(items, limit, offset)` — opaque base64url-offset cursors. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The cursor is an **opaque base64url offset**; clients echo `nextCursor` back, never build one. | One pagination contract; the encoding can evolve without a client change. |
| `decodeCursor` **never throws** — garbage / NaN / negative → `0` (start). | List routers declare only `RATE_LIMITED`/`UPSTREAM_ERROR`; a bad cursor must degrade to page one, not 500. |
| `nextCursor` is null once a page returns `< limit`. | Upstream gives no reliable total; a short page is the end signal. |
| The cursor carries offset only — `sort`/filters ride on the input each call. | No input↔cursor contradiction to define. |

## Testing

`pagination.test.ts` is the canonical unit test (cursor round-trip + garbage→0 + `nextCursor` math);
list-router integration tests assert stable paging through the surface, not the cursor internals.

## Links

Parent: [`../AGENTS.md`](../AGENTS.md) · Reference list router: [`../tokens/AGENTS.md`](../tokens/AGENTS.md)
