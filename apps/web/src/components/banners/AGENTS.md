# banners — rotating token banners

> The marquee token banners shown top **and** bottom of the landing page (TASK requirement). Renders
> live trending tokens; tapping one opens its trading page. Parent: [`../../AGENTS.md`](../../AGENTS.md).

## Contract

- **Props:** `{ tokens: TokenSummary[] }` (passed in — the banner does no fetching itself). On the
  trade route, `LiveTokenBanner` (`live-token-banner.tsx`) is the parent that supplies live data: it
  seeds from the server result and polls the shared `["trending-sidebar"]` query (30s), keeping the
  marquee presentational while its prices update in place.
- **Behavior:** horizontal auto-scroll/marquee; each pill = logo · symbol · price · 24h % (green up /
  red down). Click/tap a pill → `router.push(\`/trade/\${address}\`)`.
- **Placement:** two instances on the landing page (top + bottom); the bottom may render the list reversed.

## Conventions (Rule → Why)

| Rule | Why |
|------|------|
| Data is passed in as a prop; the banner never calls oRPC/`fetch`. | Keeps it a pure presentational client component; the page owns fetching/caching. |
| Animation is CSS/transform-based and pauses on hover; respects `prefers-reduced-motion`. | Perf + accessibility (no JS-thrash, honors motion prefs). |
| Each pill is a real `TokenSummary` (live data), keyed by `address`; show a skeleton while empty. | Real-data rule; stable React keys. |
| The whole pill is a keyboard-focusable link to the trading page. | Accessibility — tap target works for keyboard + screen readers. |

## Links

Landing: [`../../app/(marketing)/AGENTS.md`](<../../app/(marketing)/AGENTS.md>) · Tokens: [`../../../../packages/api/src/routers/tokens/AGENTS.md`](../../../../packages/api/src/routers/tokens/AGENTS.md)
