# Phase 3: Frontend Shell

> [Back to main plan](../README.md)

## Goal

Create a Next.js app with dark theme, navigation, and layout structure for the dashboard. No graph or data yet — just the shell.

## Tools

- **Research:** Cursor — `cursor agent "best Next.js 14 app router setup with Tailwind dark theme" --model gpt-5.2-codex-xhigh`
- **Code:** Cursor for CSS/layout, Opus for wiring
- **MCPs:** None

## Steps

1. Initialize Next.js 14+ app: `packages/dashboard/`
2. Add to bun workspace
3. Tailwind CSS with dark theme preset (#0A0E1A background, slate surfaces)
4. Layout: sidebar nav + main content area + top status bar
5. Pages/routes:
   - `/` — Brain View (placeholder)
   - `/ops` — Service health dashboard (wired to API)
   - `/tokens` — Token usage tracker (wired to API)
   - `/enrichment` — Enrichment progress (wired to API)
   - `/backlog` — Backlog placeholder (Phase 6)
6. Sidebar nav with icons (lucide-react), collapsible on hover
7. Top bar: connection status indicator, last-updated timestamp
8. Loading skeletons for all data panels
9. `next.config.ts` — proxy API calls to localhost:8787 (daemon)

## Depends On

- Nothing strictly, but Phase 2 for data

## Status

- [x] Initialize Next.js app (`packages/dashboard/`, bun workspace)
- [x] Tailwind dark theme (#0A0E1A bg, purple accent, cyan/emerald/amber/rose)
- [x] Layout with sidebar + main + top bar
- [x] Route structure (5 pages: /, /ops, /tokens, /enrichment, /backlog)
- [x] Collapsible sidebar (icon-only → expand on hover)
- [x] Loading skeletons (Skeleton, CardSkeleton, PageSkeleton)
- [x] Dev proxy to daemon (rewrites to localhost:8787)
- [x] Ops page wired to /health/services API
- [x] Tokens page wired to /stats/tokens API with model breakdown table
- [x] Enrichment page wired to /stats/enrichment API with progress bars
- [ ] Responsive mobile layout (deferred — sidebar collapse to bottom nav)

### Notes
- Sidebar collapses to 64px, expands to 192px on hover
- Top bar polls /api/health every 30s for connection indicator
- All data pages fetch from proxied daemon API on mount
- Build succeeds with static prerendering for all routes
