# `web` — Next.js 16 app

> The only deployable. App Router + React 19 RSC, full-stack (UI + the oRPC route handler). Runs on
> :3001. Consumes the typed `@fomo/api` surface; renders the ChadWallet landing + trading pages.

## Files

| Path | Owns |
|------|------|
| `src/app/api/rpc/[[...rest]]/route.ts` | The oRPC + OpenAPI catch-all handler. Builds the request context (`createContext(req, { db })`) — **where the real Postgres `db` is injected**. |
| `src/app/layout.tsx`, `page.tsx` | Root layout + home (home becomes the ChadWallet landing). |
| `src/components/*` | App-local composite components (providers, header, mode-toggle) + the product UI (banners, trading panels). |
| `src/utils/orpc.ts` | oRPC client + TanStack Query bindings used by client components. |

## Page modules (each gets its own `AGENTS.md`)

| Module | Path | Role |
|--------|------|------|
| landing | `src/app/(marketing)` | ChadWallet landing — hero, rotating banners top+bottom, features, app-store badges, footer. |
| trade | `src/app/(app)/trade` | Trading page — left trending list · middle token info+chart+holders+trades · right buy/sell+position. |
| banners | `src/components/banners` | Rotating token banner (top + bottom); tapping a token routes to its trading page. |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Async data fetching in **Server Components**; client components only for interactivity (wallet, forms, live updates). | RSC default keeps secrets server-side and bundles smaller (root code standards). |
| Secrets/keys are used only in RSC / route handlers / `@fomo/api`; the client gets data, never keys. | Root domain rule — secrets never reach the browser. |
| Wallet signing is **client-side via Privy**; the server only prepares the Jupiter transaction. | The server never holds private keys (root domain rule). |
| Use `@fomo/ui` primitives + `next/image`; product composites live here, not in `@fomo/ui`. | Generic vs app-specific separation. |

## Links

Root: [`../../AGENTS.md`](../../AGENTS.md) · API: [`../../packages/api/AGENTS.md`](../../packages/api/AGENTS.md) ·
UI: [`../../packages/ui/AGENTS.md`](../../packages/ui/AGENTS.md)
