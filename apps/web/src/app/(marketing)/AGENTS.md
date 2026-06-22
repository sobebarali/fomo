# landing (marketing)

> The ChadWallet landing page (fomo.family-style, dark cosmic + neon green — see the Penpot design).
> Server-Component-first; the only data is live token rows for the banners. Parent: [`../../../AGENTS.md`](../../../AGENTS.md).

## Sections (top → bottom)

Rotating token banner (top) → nav + **Sign in (Apple/Google via Privy)** → **centered hero** (headline +
app-store badges + phone mock + floating coins) → **app-screenshot gallery** (marquee) → product showcase
(looping **demo video** in a phone) → **never miss out again** (the six **product-flow montages** as the
feature grid) → social proof (logo + orbital + watermark) → CTA → rotating token banner (bottom) → footer.

Layout is **centered + curated** (fomo.family-style): one focal visual per section with generous vertical
rhythm — deliberately *not* a dense grid of everything.

Brand assets live in `/assests` and are served **downscaled** from `apps/web/public`: `logo-white.png`/
`logo-black.png` (Chad mark), `screens/*` (App-Store previews), `flows/*` (product-flow montages),
`demo.mp4` (product video), `space-bg.jpg` (hero cosmic bg).

## Data + boundaries

- **Banners** consume `tokens.trending` (server-fetched, passed to the banner component). Tapping a
  token routes to `/(app)/trade/[address]`. See [`../../components/banners/AGENTS.md`](../../components/banners/AGENTS.md).
- **Sign in** is a client island using the Privy SDK (`NEXT_PUBLIC_PRIVY_APP_ID`); everything else is RSC.
- Brand tokens (colors/fonts) come from `@fomo/ui` `globals.css` (the `.dark` set = ChadWallet dark
  cosmic + neon-green); the layout forces `dark` so the landing is dark regardless of system theme.
  App-store badges + mobile links from `TASK.md`.

## Motion

All animation is **pure CSS** (in `marketing.css`) so sections stay Server Components — no JS, no
animation library. Marquee banners, hero on-load rise, floating coins, a slow-spinning orbital ring,
and scroll-reveal sections (`animation-timeline: view()`, with a static fully-visible fallback for
unsupported browsers). Everything is disabled under `prefers-reduced-motion`.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Page + sections are Server Components; only the sign-in + animated banner are client islands. | Smaller bundle, secrets stay server-side (root code standards). |
| `rel="noopener"` on every external/store link; `next/image` for all imagery. | Security + perf standards. |
| No fake token data — banners render live `tokens.trending`, with a skeleton while loading. | Real-data rule. |

## Links

App: [`../../../AGENTS.md`](../../../AGENTS.md) · Banners: [`../../components/banners/AGENTS.md`](../../components/banners/AGENTS.md) · Trade: [`../(app)/trade/AGENTS.md`](<../(app)/trade/AGENTS.md>) · Tokens: [`../../../../../packages/api/src/routers/tokens/AGENTS.md`](../../../../../packages/api/src/routers/tokens/AGENTS.md)
