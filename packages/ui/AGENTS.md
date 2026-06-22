# `@fomo/ui` — shared UI primitives

> shadcn/ui primitives + Tailwind v4 tokens, shared by `apps/web`. Style `base-lyra`, neutral base,
> Lucide icons. Import via `@fomo/ui/components/*`.

## Files

| Path | Owns |
|------|------|
| `src/components/*` | shadcn primitives (`button`, `card`, `input`, `label`, `checkbox`, `dropdown-menu`, `skeleton`, `sonner`). Add new primitives via `bunx shadcn add` into this package. |
| `src/styles/globals.css` | Tailwind `@theme` tokens — the single source of color/radius/font tokens. Brand tokens (ChadWallet dark + neon-green; see the Penpot design) land here. |
| `src/lib/utils.ts` | `cn` (clsx + tailwind-merge). |

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Primitives are presentational only — no data fetching, no oRPC. | Reusable across pages; data flows from RSC/route handlers (root code standards). |
| React 19 — pass `ref` as a prop (no `forwardRef`); function components, hooks at top level. | Matches the enforced Ultracite/React-19 standard. |
| Brand/theme changes go in `globals.css` tokens, not per-component hardcoded colors. | One source of truth; the trading page (dark) and landing reuse the same tokens. |
| Composite, feature-specific components (token banner, buy panel) live in `apps/web/src/components`, not here. | This package stays generic primitives; product composition is app-local. |

## Links

Root: [`../../AGENTS.md`](../../AGENTS.md) · App: [`../../apps/web/AGENTS.md`](../../apps/web/AGENTS.md)
