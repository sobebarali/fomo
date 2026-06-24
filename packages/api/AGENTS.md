# `@fomo/api` — typed API surface (oRPC)

> The end-to-end-typed contract `apps/web` compiles against. oRPC procedures + context; OpenAPI is
> generated from the same definitions. **This file defines the contract format + error taxonomy**
> every router module's `AGENTS.md` references. Testing doctrine:
> [`../config/AGENTS.md`](../config/AGENTS.md).

## Files

| File | Owns |
|------|------|
| `src/index.ts` | `os.$context<Context>()` → `publicProcedure` (and `protectedProcedure` when auth lands — requires a session). |
| `src/context.ts` | `createContext(req, { db })` → `{ db, auth, session }`. **DB is injected** (real Postgres from the route handler; PGlite in tests) so handlers never import the `db` singleton. |
| `src/routers/` | the procedure tree merged into `appRouter` — one folder per module. See [`src/routers/AGENTS.md`](src/routers/AGENTS.md). |
| `src/integrations/` | external-service clients (BirdEye/Alchemy/Jupiter/Privy) — the mocked edge in tests. |
| `src/test-support/context.ts` | `testContext(db)` — builds a `Context` for integration tests. |

## Contract format (every procedure)

A router module's `AGENTS.md` documents each procedure as:

- **Access:** `public` | `protected` (protected requires a Privy session).
- **Input:** a named Zod schema exported from the module's `schema.ts` (never inlined in `index.ts`).
- **Output:** the serialized shape returned to the client.
- **Errors:** codes from the taxonomy below, declared via oRPC `.errors({ CODE: {} })`.
- **Side effects:** DB writes / external calls / cache population — or "none".

## Error taxonomy

Declare on the procedure (`.errors({...})`) and throw `routerError("CODE")` from
`src/routers/_shared/errors.ts` so the HTTP status matches the taxonomy. Tests assert the code.

| Code | When |
|------|------|
| `UNAUTHORIZED` | No / invalid Privy session on a protected procedure. |
| `FORBIDDEN` | Authenticated but not allowed (e.g. acting on another user's position). |
| `NOT_FOUND` | Token / resource doesn't exist. |
| `CONFLICT` | Unique-constraint collision (e.g. duplicate `privyId`). |
| `RATE_LIMITED` | We hit a free-tier limit (BirdEye/Alchemy) — surfaced, not a 500. |
| `UPSTREAM_ERROR` | An external service (BirdEye/Jupiter/Alchemy) failed or returned malformed data. |
| `BAD_REQUEST` | Input fails a domain check beyond Zod (e.g. unsupported mint). |

## Shared building blocks (copy these, don't re-derive)

1. **Every router folder = `index.ts` + `schema.ts`.** Handlers in `index.ts`; named Zod inputs in
   `schema.ts` (so they're importable/testable, never inlined). The `tokens/` folder is the reference shape.
2. **Validate at the boundary** — `.input(zodSchema)` on every procedure with args; secrets stay server-side.
3. **External reads go through `src/integrations/*`** (cached + rate-limited there), never `fetch` inline.
4. **Cursor pagination** for lists — one helper in `src/routers/_shared/` (added with the first list router).
5. **Taxonomy errors** via `routerError(...)` — never raw `new ORPCError(...)` in routers.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| DB comes off `context.db`; routers import tables from `@fomo/db/schema`, never the `db` singleton. | Keeps handlers testable (PGlite injected) and env-free at import (`@fomo/db/schema` doesn't load env). |
| Map upstream/library errors to a taxonomy code at the boundary; never leak a raw 500. | The client + tests depend on stable codes, not provider error shapes. |
| New router/integration = folder + `AGENTS.md` + `CLAUDE.md` symlink in the same change (root Rule 13). | The API surface is documented where it lives. |

## Links

Root: [`../../AGENTS.md`](../../AGENTS.md) · Routers: [`src/routers/AGENTS.md`](src/routers/AGENTS.md) ·
Data: [`../db/AGENTS.md`](../db/AGENTS.md) · Testing: [`../config/AGENTS.md`](../config/AGENTS.md)
