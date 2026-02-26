# Phase 8: Deploy & Polish

> [Back to main plan](../README.md)

## Goal

Deploy to Vercel at etanheyman.com/dashboard (or dashboard.etanheyman.com). Mobile-friendly. Presentation mode. Export capabilities.

## Tools

- **Research:** Gemini — Vercel deployment best practices
- **Code:** Cursor for responsive/animation polish, Opus for deploy config
- **MCPs:** None

## Steps

1. Vercel deployment config (vercel.json or Next.js config)
2. Domain setup: `dashboard.etanheyman.com` or `/dashboard` path on existing site
3. Mobile responsive: bottom nav, swipe between views, touch-friendly graph
4. Presentation mode: full-screen brain view, auto-rotate, hide UI chrome
5. Export: PNG screenshot of current graph view, PDF report of stats
6. Performance: lazy load graph libs, code splitting, image optimization
7. SEO/OG tags for public sharing (screenshot of brain view as OG image)
8. README for others: how to deploy your own golems dashboard
9. Smoke tests: verify all pages load, auth flow works, graph renders
10. Announcement: blog post / LinkedIn about the dashboard

## Depends On

- All previous phases

## Status

- [x] Vercel deployment — vercel.json, next.config.ts with configurable daemon URL, standalone output
- [x] Mobile responsive — bottom nav for mobile, safe-area insets, responsive padding
- [x] Presentation mode — fullscreen brain view, hide all UI chrome, Escape to exit
- [x] Export capabilities — PNG export of brain view canvas
- [x] Performance — ForceGraph3D already dynamic import, Three.js tree-shaken
- [x] SEO/OG tags — metadata + viewport exports in root layout
- [ ] Domain setup — needs Vercel project creation + DNS config (user action)
- [ ] Documentation for others — deferred to post-deploy
- [ ] Announcement — deferred (user decides when)
