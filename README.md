# ChadWallet

A [fomo.family](https://fomo.family)-style **Solana memecoin trading app**, built with the
**ChadWallet** brand. A founder-facing landing page plus a live trading page — trending tokens,
token info + price chart + holders + live trades, and a buy/sell panel with the user's position.
Rotating token banners top and bottom; tap a token to open its trading page. Sign in with
Apple/Google via Privy. Powered by **real on-chain data — no mocks**.

Mobile apps:
[Android](https://play.google.com/store/apps/details?id=xyz.chadwallet.www) ·
[iOS](https://apps.apple.com/us/app/chadwallet/id6757367474)

## Features

- **Landing page** — ChadWallet brand, app store links, rotating token banners.
- **Trading page** (3-column): trending tokens (left) · token info + TradingView chart + holders +
  live trades (middle) · buy/sell + position (right).
- **Auth** — sign in with Apple/Google through **Privy**, with an embedded Solana wallet.
- **Swaps** — quotes + execution via **Jupiter**; the user signs client-side via Privy (the server
  never holds private keys).
- **Real market data** — trending, prices, charts, holders, and trades come from live sources behind
  a `market` facade.

## Stack

Bun + Turborepo monorepo (`@fomo/*`), generated with Better-T-Stack.

- `apps/web` — **Next.js 16** (App Router, React 19, RSC) — UI + API routes.
- `packages/api` — **oRPC** routers + context; end-to-end typed, OpenAPI.
- `packages/db` — **Drizzle ORM** schema + queries against **PostgreSQL**.
- `packages/ui` — shared **shadcn/ui** primitives + Tailwind tokens.
- `packages/env` — validated env (t3-env + **Zod 4**).
- `packages/config` — shared tsconfig/tooling + testing harness.

## Market data sources

The trade UI reads through the `market` facade (`packages/api/src/integrations/market`), which
composes **free, keyless** sources to stay within free-tier limits:

- **DexScreener** — token price / market cap / volume / liquidity / metadata.
- **GeckoTerminal** — trending list + OHLCV candles + recent trades.
- **Alchemy** — Solana RPC (balances, holders, token supply).
- **Jupiter** — swap quotes + execution.
- **Privy** — server-side token verification.

> BirdEye is kept as a reference client only — its free CU quota is exhausted, so it is out of the
> read path.

## Getting Started

```bash
bun install
```

Set environment variables (validated at boot via `@fomo/env`) in `apps/web/.env` — Postgres
connection, Privy app ID/secret, and Alchemy RPC. See `packages/env` for the full schema.

Apply the schema, then run dev:

```bash
bun run db:push
bun run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Spec-Driven Development

The spec lives next to the code: every module folder carries an `AGENTS.md` (with a `CLAUDE.md`
symlink) defining its contract — procedures, Zod I/O, error codes, side effects — asserted by
colocated `*.integration.test.ts`. Start at the root [`AGENTS.md`](AGENTS.md) for the module map,
code standards, and domain hard rules. Testing doctrine:
[`packages/config/AGENTS.md`](packages/config/AGENTS.md).

Tests run via Vitest with the real DB through **PGlite**; only external service edges
(DexScreener / GeckoTerminal / Alchemy / Jupiter / Privy) are mocked.

## Deployment

Deployed on **Railway** (project `chadwallet`): web `Dockerfile` + managed Postgres.
Docker Compose exists for local (`bun run docker:up`).

## Available Scripts

- `bun run dev` / `dev:web` — start in development mode
- `bun run build` — build all apps
- `bun run check-types` — TypeScript across the monorepo
- `bun x ultracite fix` — lint/format (Ultracite / Biome)
- `bun run db:push` / `db:generate` / `db:migrate` / `db:studio` — database
- `bun run docker:build` / `docker:up` / `docker:logs` / `docker:down` — local Docker stack

## Project Structure

```
fomo/
├── apps/
│   └── web/            # Next.js 16 app — UI (src/app), API routes, components
├── packages/
│   ├── api/            # oRPC routers + integrations (market facade, swap, auth, …)
│   ├── db/             # Drizzle schema + Postgres queries
│   ├── ui/             # shared shadcn/ui primitives + Tailwind tokens
│   ├── env/            # validated env (t3-env + Zod)
│   └── config/         # shared tsconfig + testing doctrine + Vitest/PGlite harness
```
