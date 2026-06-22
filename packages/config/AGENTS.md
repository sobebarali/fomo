# `@fomo/config` — shared tooling + testing doctrine

> Shared TypeScript base (`tsconfig.base.json`) and the **Vitest factory** (`vitest.base.ts`) every
> workspace extends. This file is also the canonical **testing doctrine** for the whole monorepo —
> root Rule 14 defers here. Contract format + error taxonomy live in
> [`../api/AGENTS.md`](../api/AGENTS.md).

## Exports

| Export | Owns |
|--------|------|
| `@fomo/config/tsconfig.base.json` | Strict TS base; every package's `tsconfig.json` extends it. |
| `@fomo/config/vitest.base` | `defineVitestConfig({ pg?, ...overrides })` — shared Vitest defaults; `pg: true` raises the timeout for PGlite integration tests and is deep-merged with any Vite/Vitest override. |

## Testing strategy (the trophy, not the pyramid)

Effort is weighted, top to bottom:

1. **Static analysis (maximize).** Strict TypeScript + Ultracite/Biome. A type error gates a commit
   like a failing test — it's the cheapest, broadest net. This is why `check-types` is wired per
   package and runs first in the pre-commit hook + CI.
2. **Integration (the bulk).** Exercise a router procedure through its public surface
   (`call(appRouter.x.y, input, { context })` from `@orpc/server`) against a **real DB (PGlite)**,
   mocking only the external service edges. Colocated `*.integration.test.ts`.
3. **E2E (thin).** A few critical user paths (sign-in → see trending → open token → quote). Added later.
4. **Unit (selective).** Pure helpers with real edge cases (price formatting, cursor math, slippage).

## What runs for real vs what's mocked

- **Real:** the DB (PGlite via `createTestDb` in [`@fomo/db/testing`](../db/src/testing.ts)), oRPC
  validation + error mapping, Zod schemas, serializers, pagination.
- **Mocked (only the true external edges):** BirdEye, Alchemy, Jupiter, Privy HTTP. Mock at the
  integration-client boundary (`packages/api/src/integrations/*`) with `vi.mock` or an injected
  `fetch` — never reach the network in a test. Provider reality is covered out-of-band by opt-in
  `*.smoke.ts` (real key, not in the normal run).

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Tests assert oRPC **error codes** (`.rejects.toMatchObject({ code: "NOT_FOUND" })`) + I/O shape + side effects — never message strings. | Messages are copy; codes are the contract. A message-based test passes on the wrong behavior and breaks on a reworded string. |
| Colocate tests with code: `*.integration.test.ts` (through the surface) · `*.test.ts` (unit) · `*.smoke.ts` (opt-in, real provider). | The spec, code, and its proof live in one folder; `vitest.base` `include` picks up `test`/`spec`, not `smoke`. |
| New integration test = `beforeAll` `createTestDb()` → `afterEach` reset rows → `afterAll` `close()`. Inject the db via `testContext(db)`. | One real-DB lifecycle; no Docker; tests stay isolated and parallel-safe. |
| Never hit the network. Mock the integration client, not `global.fetch` ad hoc. | Free-tier rate limits + flake; the edge is the only thing we don't own. |
| `pg: true` only for packages with DB integration tests. | Don't pay PGlite startup where there's nothing to test against. |

## Run cadence

| When | Runs |
|------|------|
| Pre-commit (husky) | `check-types` → `test` (turbo) → `ultracite fix` (re-stages) |
| CI (push/PR) | job `static` (`check-types` + `ultracite check`) → job `test` (`turbo test`) |
| Out-of-band | opt-in `*.smoke.ts` against real provider keys |

## Links

Root rules: [`../../AGENTS.md`](../../AGENTS.md) · API contract: [`../api/AGENTS.md`](../api/AGENTS.md) ·
DB harness: [`../db/AGENTS.md`](../db/AGENTS.md)
