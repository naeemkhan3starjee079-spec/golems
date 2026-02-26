# Phase 10: Docs Refresh — Packages

> [Back to main plan](../README.md)

## Goal
Update all per-package documentation pages to reflect current code, capabilities, and integration points.

## Tools
- **Research:** gemini — diff each doc page against its CLAUDE.md
- **Code:** cursor — markdown edits
- **MCPs:** zikaron

## Steps

1. **Update `golems/shared.md`** — Supabase factory, LLM routing, notifications, state store.
2. **Update `golems/claude.md`** — Telegram bot, orchestrator, golem registration.
3. **Update `golems/recruiter.md`** — Outreach pipeline, practice system, contact management.
4. **Update `golems/email.md`** — Email triage, routing, draft replies, follow-up tracking.
5. **Update `golems/job-golem.md`** — Scraping, matching, ATS integration.
6. **Update `golems/teller.md`** — Finance tracking, categorization, alerts.
7. **Update `golems/coach.md`** — Calendar, daily planning, status aggregation.
8. **Update `packages/content.md`** — Visual content factory + text publishing (major update needed).
9. **Update `packages/services.md`** — Night Shift, Briefing, Cloud Worker, Doctor, Wizard.
10. **Update `packages/zikaron.md`** — 257K chunks, enrichment pipeline, MCP tools.
11. **Create `packages/orchestrator.md`** — n8n + render microservice (new page).
12. **Create `packages/dashboard.md`** — Web dashboard (new page, more detailed than arch doc).

## Depends On
- Phase 9 (architecture docs set the context)

## Status
- [x] shared.md — Added Whoop client, Vercel LLM, GLM modules
- [x] claude.md — Fixed file paths (services vs claude), added frontmatter
- [x] recruiter.md — Fixed file paths, added frontmatter
- [x] email.md — Added frontmatter with title/description
- [x] job-golem.md — Added frontmatter with title/description
- [x] teller.md — Added frontmatter with title/description
- [x] coach.md — Full rewrite: Whoop, Huberman, coaching engine, /schedule, dashboard section
- [x] content.md — Full rewrite: visual factory, Remotion, ComfyUI, dataviz, pipeline router
- [x] services.md — Added WhoopSync cron (7am + 2pm)
- [x] zikaron.md — Updated to 257K+ chunks, all 8 MCP tools, enrichment pipeline
- [x] orchestrator.md (new) — n8n workflows + render microservice
- [x] dashboard.md — Added /coach page, TOC, scroll spy, mermaid, prev/next nav
