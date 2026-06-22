# `@fomo/env` — validated environment

> t3-env + Zod 4. Validated at boot — a missing/invalid var fails fast. The **trust boundary**:
> server secrets (`./server`) never reach the browser; only `./web` (public) vars do.

## Exports

| Export | Owns |
|--------|------|
| `@fomo/env/server` | Server-only env. Today: `DATABASE_URL`, `CORS_ORIGIN`, `NODE_ENV`. To add (when their feature lands): `BIRDEYE_API_KEY`, `ALCHEMY_RPC_URL`, `JUPITER_*`, `PRIVY_APP_SECRET`. |
| `@fomo/env/web` | Client-safe, `NEXT_PUBLIC_*` only. To add: `NEXT_PUBLIC_PRIVY_APP_ID`. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| API keys / secrets go in `./server` **only**; the browser bundle imports `./web`. | A secret in `./web` ships to every visitor (root domain rule: secrets never reach the browser). |
| Add the var to the schema in the same change that first reads it; never read `process.env` directly. | Boot-time validation catches a misconfigured deploy before it serves a request. |
| Only `NEXT_PUBLIC_PRIVY_APP_ID` is public — the Privy **app secret** stays server-side. | Privy splits a public app id (client SDK) from a server secret (token verification). |

## Links

Root: [`../../AGENTS.md`](../../AGENTS.md) · Consumers: [`../db/AGENTS.md`](../db/AGENTS.md) · [`../api/AGENTS.md`](../api/AGENTS.md)
