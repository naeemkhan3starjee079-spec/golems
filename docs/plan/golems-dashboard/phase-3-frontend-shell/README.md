# Phase 3: Frontend Shell

> [Back to main plan](../README.md)

## Goal

Create a Next.js app with dark theme, navigation, and layout structure for the dashboard. No graph or data yet — just the shell.

## Tools

- **Research:** Cursor — `cursor agent "best Next.js 14 app router setup with Tailwind dark theme" --model gpt-5.2-codex-xhigh`
- **Code:** Cursor for CSS/layout, Opus for wiring
- **MCPs:** None

## Steps

1. Initialize Next.js 14+ app: `packages/dashboard/` (or separate repo if preferred)
2. Add to bun workspace (if in monorepo) or standalone with own package.json
3. Tailwind CSS with dark theme preset (#0A0E1A background, slate surfaces)
4. Layout: sidebar nav + main content area + top status bar
5. Pages/routes:
   - `/` — Brain View (default landing)
   - `/ops` — Service health dashboard
   - `/tokens` — Token usage tracker
   - `/enrichment` — Enrichment progress
   - `/settings` — User settings (future: auth)
6. Sidebar nav with icons (lucide-react)
7. Top bar: connection status indicator, last-updated timestamp, user avatar placeholder
8. Responsive: works on mobile (sidebar collapses to bottom nav)
9. Loading skeletons for all data panels
10. `next.config.js` — proxy API calls to localhost:8765 (daemon) during dev

## Depends On

- Nothing strictly, but Phase 2 for data

## Status

- [ ] Initialize Next.js app
- [ ] Tailwind dark theme
- [ ] Layout with sidebar + main + top bar
- [ ] Route structure
- [ ] Responsive mobile layout
- [ ] Loading skeletons
- [ ] Dev proxy to daemon
