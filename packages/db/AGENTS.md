# `@fomo/db` — Drizzle schema + Postgres

> Drizzle ORM over PostgreSQL. Holds **only user identity** — market data (tokens/prices/holders/
> trades) is real-time from BirdEye/Alchemy and is never persisted. Also home of the **PGlite test
> harness** every integration test uses. Testing doctrine: [`../config/AGENTS.md`](../config/AGENTS.md).

## Files

| File | Owns |
|------|------|
| `src/index.ts` | `createDb(connectionString?)` (node-postgres) · `db` singleton · `Db` type (the injectable handle). |
| `src/schema/users.ts` | `users` — Privy-linked account (`privyId` unique, `email?`, `walletAddress?`, timestamps). |
| `src/schema/index.ts` | schema barrel — `import * as schema` aggregates every table for `drizzle(client, { schema })`. |
| `src/testing.ts` | `createTestDb()` — a fresh in-process **PGlite** db with the current schema pushed (via `drizzle-kit/api` `pushSchema`). Test-only; the Postgres analog of an in-memory Mongo. |
| `src/db.integration.test.ts` | The harness sanity check (insert/read + unique-constraint) — fails loudly if the test DB breaks. |

## Procedures / surface

No oRPC here — this package exports tables + the `Db` handle. Queries live where they're used:
routers read off `context.db` and import tables from `@fomo/db/schema`. Cross-cutting query helpers
(e.g. `upsertUserByPrivyId`) land in `src/queries/` when a second caller needs them (not before).

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| The `Db` handle is **injected via context**, not imported as a singleton in handlers. | Tests pass a PGlite `db`; handlers stay testable and don't load env at import. |
| Persist identity only — never cache market data in Postgres. | Real-data rule: prices/holders/trades come live from BirdEye/Alchemy (root domain rule). |
| Schema changes go through `drizzle-kit generate` → migration; tests get the schema via `pushSchema` (no migration files needed in tests). | One migration path for prod; zero-friction schema in tests. |
| `import * as schema` + the schema barrel are `biome-ignore`d (Drizzle requires them). | The API needs the whole schema object; the ignores name the intentional exception. |

## Hardest invariant — the test DB is real

`createTestDb` pushes the **actual** Drizzle schema into a real Postgres (PGlite), so unique
constraints, defaults, and SQL behave exactly like production. A test that passes here would pass on
Supabase. If `db.integration.test.ts` fails, the whole TDD harness is suspect — fix it first.

## Links

Root: [`../../AGENTS.md`](../../AGENTS.md) · API context: [`../api/AGENTS.md`](../api/AGENTS.md) ·
Testing: [`../config/AGENTS.md`](../config/AGENTS.md)
