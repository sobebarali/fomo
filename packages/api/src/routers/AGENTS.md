# Routers (`@fomo/api` · routers)

> The oRPC procedure tree merged into `appRouter`. Each child folder is a router module with its own
> `AGENTS.md` (the contract `apps/web` compiles against). **Source of truth for the API surface.**
> Format + error codes: [`../../AGENTS.md`](../../AGENTS.md).

## Layout

| Router | Owns | Reads from |
|--------|------|------------|
| `auth/` | Verify the Privy session, return the current user; upsert the user row on first sign-in. | Privy + `users` |
| `tokens/` | Trending list + single-token detail/metadata. Cursor-paginated list. | market |
| `chart/` | OHLCV candles for a token + interval → feeds the TradingView chart. | market |
| `holders/` | Top holders for a token. | market |
| `trades/` | Recent/live trades for a token. | market |
| `swap/` | Jupiter quote for a buy/sell + the unsigned transaction to sign client-side (Privy). | Jupiter |
| `portfolio/` | The user's SOL + token balances and per-token position (cost basis, P/L). | Alchemy + `swap`/market prices |

`healthCheck` (the scaffold stub) stays in `index.ts` alongside the live routers until replaced.

## Shared building blocks (copy these, don't re-derive)

- **Every router folder = `index.ts` + `schema.ts`.** Named Zod inputs in `schema.ts`. `tokens/` is the
  reference shape — copy it (`scripts/new-module.sh tokens <name>`), don't re-derive.
- **List endpoints are cursor-paginated** via the shared helper in `_shared/` (lands with `tokens`).
- **External data comes from `../integrations/*`** (cached + rate-limited), surfaced through the router;
  the router maps any failure to `UPSTREAM_ERROR` / `RATE_LIMITED`.
- **Protected procedures** (anything user-specific: `portfolio`, `swap` execution prep, `auth.me`)
  require a session; reads of public market data (`tokens`/`chart`/`holders`/`trades`) are public.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| One folder per router, merged into `appRouter` in `index.ts`. | Greppable surface; no god-router. |
| Inputs are named exports in `schema.ts`, never inlined. | Reused by tests + client; an inlined schema can't be shared. |
| Market-data routers are thin: validate → call integration (cached) → map → return. | Logic + caching live in the integration; routers stay testable. |
| New router = folder + `AGENTS.md` + symlink in the same change (root Rule 13). | API surface documented where it lives. |

## Links

Parent: [`../../AGENTS.md`](../../AGENTS.md) · Integrations: [`../integrations`](../integrations) ·
Data: [`../../../db/AGENTS.md`](../../../db/AGENTS.md)
