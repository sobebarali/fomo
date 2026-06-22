These rules apply to every agent working in this project — Claude Code, opencode, Codex, or any
other — unless explicitly overridden. Bias: caution over speed on non-trivial work.

**What this is:** **ChadWallet** — a [fomo.family](https://fomo.family)-style **Solana memecoin
trading app**. A founder-facing **landing page** (ChadWallet brand) plus a **trading page**: trending
tokens list, token info + price chart + holders + live trades, and a buy/sell panel with the user's
position. Rotating token banners top and bottom; tapping a token opens its trading page. Auth is
**sign-in with Apple/Google via Privy**. Power everything with **real on-chain data** — no mocks.

Brand assets: see `TASK.md`. Mobile apps:
[Android](https://play.google.com/store/apps/details?id=xyz.chadwallet.www) ·
[iOS](https://apps.apple.com/us/app/chadwallet/id6757367474).

**Stack:** Bun + Turborepo monorepo (`@fomo/*`), generated with Better-T-Stack.
- `apps/web` — **Next.js 16** (App Router, React 19, RSC) — the only app; full-stack (UI + API routes).
- `packages/api` — **oRPC** routers + context (`src/routers`, `src/context.ts`); end-to-end typed, OpenAPI.
- `packages/db` — **Drizzle ORM** schema + queries against **PostgreSQL** (`src/schema`).
- `packages/ui` — shared **shadcn/ui** primitives + Tailwind tokens (`Button` etc. via `@fomo/ui/components/*`).
- `packages/config` — shared tsconfig/tooling base.
- `packages/env` — validated env (t3-env + **Zod 4**).

Validation: **Zod 4**. Lint/format: **Ultracite** (Biome) — `bun x ultracite fix`. Types: `bun run check-types`.
Dev: `bun run dev` (web on http://localhost:3001). DB: `bun run db:push` / `db:studio` / `db:migrate`.

**External services** (all free-tier; keys server-side only):
- **Privy** — Apple/Google auth + embedded Solana wallet. https://privy.io
- **BirdEye** — token data, prices, holders, trades. https://birdeye.so/data-api
- **Alchemy** — Solana RPC. https://www.alchemy.com/rpc-api
- **Jupiter** — swap quotes + execution (buy/sell). https://developers.jup.ag/docs/get-started
- **TradingView** — charting library. https://www.tradingview.com/charting-library-docs/latest/api/
- **Supabase / Cloudflare / Vercel** — infra (DB/storage, edge, hosting).

## Working rules

1. **Think before coding.** State assumptions explicitly. Ask rather than guess. Push back when a
   simpler approach exists. Stop when confused.
2. **Simplicity first.** Minimum code that solves the problem. No speculative abstractions, no
   abstraction for single-use code.
3. **Surgical changes.** Touch only what you must. Don't refactor what isn't broken. Match existing style.
4. **Read before you write.** Read exports, callers, and shared utilities (e.g. `@fomo/ui`,
   `packages/api/src/context.ts`) before adding code. If unsure why code is shaped a way, ask.
5. **Verify the dependency before you build on it.** Check what's current and maintained before
   adding a library; prefer the actively-maintained OSS option that fits the stack; pin the version.
   Use `context7` for library docs, web search for the ecosystem state.
6. **Research non-trivial choices, then ask.** For a new feature/approach/dependency, check current
   (2026) practice, surface 2–4 vetted options with trade-offs via `AskUserQuestion`, and let the
   user pick before you commit. Skip only for genuinely trivial changes.
7. **Track multi-step work.** Any task with ≥3 distinct steps uses the task tracker; mark
   `in_progress` before starting and `completed` the moment it ships — never batch.
8. **Fail loud.** "Completed"/"tests pass" is wrong if anything was skipped silently. Surface
   uncertainty, don't hide it.
9. **No comments unless they earn it.** Default to none — well-named identifiers say WHAT. Comment
   only the non-obvious WHY: a hidden constraint, a subtle invariant, a workaround.
10. **Match the codebase's conventions, even if you disagree.** Conformance > taste. Surface harmful
    conventions; don't fork silently.

## Domain hard rules (never violated)

- **Secrets never reach the browser.** BirdEye/Alchemy/Jupiter API keys and any Privy app secret
  live server-side only (env + oRPC handlers / Next.js route handlers / RSC). The client gets data,
  never keys. Never commit or log secrets (redact `token|secret|key|password|authorization`).
- **Validate every input with Zod before any DB write or external call.** No `any` across module
  boundaries — use `unknown` + narrow.
- **Real data only.** Token lists, prices, charts, holders, and trades come from BirdEye/Alchemy —
  never hardcode or fake market data.
- **Rate-limit / cache external API calls** (BirdEye, Alchemy) to stay within free-tier limits;
  cache hot reads rather than refetch per render.
- **Swaps go through Jupiter** for quotes + execution; surface slippage and confirm before signing.
  Wallet signing happens client-side via Privy — the server never holds user private keys.
- **Env via `@fomo/env`** (validated at boot — a missing/invalid var fails fast).

## Code standards

Ultracite (Biome) is enforced — full standards live in [`AGENTS.md`](AGENTS.md) (read it before
writing code). Headlines: prefer `unknown` over `any`; `const` by default; `for...of` over
`.forEach`; optional chaining + nullish coalescing; function components with hooks at top level;
`key` on iterated elements (stable IDs, not indices); semantic HTML + ARIA; `rel="noopener"` with
`target="_blank"`; no `console.log`/`debugger` in production; Next.js `<Image>` over `<img>`; RSC
for async data fetching; React 19 — pass `ref` as a prop (no `forwardRef`). Run `bun x ultracite fix`
before committing.

## Structure

```
fomo/
├── apps/
│   └── web/            # Next.js 16 app — UI (src/app), API routes (src/app/api), components, lib
├── packages/
│   ├── api/            # oRPC routers (src/routers) + context — typed API surface
│   ├── db/             # Drizzle schema (src/schema) + Postgres queries
│   ├── ui/             # shared shadcn/ui primitives + Tailwind tokens
│   ├── env/            # validated env (t3-env + Zod)
│   └── config/         # shared tsconfig/tooling base
```

Deployment: Vercel (web) + a managed Postgres (Supabase). Docker Compose exists for local
(`bun run docker:up`). See `README.md` for setup and scripts.
