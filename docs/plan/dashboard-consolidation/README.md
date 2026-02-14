# Dashboard Consolidation — Single Source of Truth

> Merge all web properties into `dashboard.etanheyman.com`. Fix monitoring gaps. Wire up content pipelines. Make the dashboard THE place to check everything.

## Context

Three separate web properties exist:
- `dashboard.etanheyman.com` — new dashboard (brain view, ops, backlog, content, tokens, enrichment)
- `etanheyman.com/admin/golem/*` — old admin (per-golem pages: recruiter, teller, emails, alerts, nightshift, monitor, content)
- `etanheyman.com/golems/docs/*` — golems documentation (30 markdown pages)

**Goal:** Everything in one place at `dashboard.etanheyman.com`. Delete admin/golems routes from portfolio.

## Current Issues
- Token tracking only shows Haiku + Gemini (no local GLM, no CC proxy)
- Daily cost graph broken (all data on same day = no bars)
- Period selector (7d/14d/30d) doesn't visually change anything
- Enrichment page disconnected (daemon-only, 252K chunks need processing)
- Service monitoring lacks per-golem detail
- Content pipeline page shows "No runs" (orchestrator not deployed)
- Backlog not connected to PRDs/large-plans
- Night Shift, Alerts, per-golem views only exist in old admin

---

## Progress

| # | Phase | Folder | Status | PR |
|---|-------|--------|--------|----|
| 1 | Token Tracking Fix | [phase-1-token-tracking-fix](phase-1-token-tracking-fix/) | done | #168 |
| 2 | Enrichment Connect | [phase-2-enrichment-connect](phase-2-enrichment-connect/) | pending | |
| 3 | Service Monitoring Upgrade | [phase-3-service-monitoring](phase-3-service-monitoring/) | pending | |
| 4 | Admin Migration | [phase-4-admin-migration](phase-4-admin-migration/) | pending | |
| 5 | Per-Golem Detail Pages | [phase-5-golem-pages](phase-5-golem-pages/) | pending | |
| 6 | Docs Integration | [phase-6-docs-integration](phase-6-docs-integration/) | pending | |
| 7 | Backlog + PRD Integration | [phase-7-backlog-prd](phase-7-backlog-prd/) | pending | |
| 8 | Content Pipeline Skills + Viz | [phase-8-n8n-pipeline-hookup](phase-8-n8n-pipeline-hookup/) | pending | |
| 9 | Docs Refresh: Architecture | [phase-9-docs-refresh-architecture](phase-9-docs-refresh-architecture/) | pending | |
| 10 | Docs Refresh: Packages | [phase-10-docs-refresh-packages](phase-10-docs-refresh-packages/) | pending | |
| 11 | Docs Refresh: Guides | [phase-11-docs-refresh-guides](phase-11-docs-refresh-guides/) | pending | |
| 12 | Docs Final Verification | [phase-12-docs-final-verification](phase-12-docs-final-verification/) | pending | |

---

## Execution Rules

Each phase = one branch = one PR. See `/large-plan` skill for the full protocol.

## Cross-Phase Knowledge

- Token tracking schema: see phase-1/findings.md
- Admin page inventory: see phase-4/findings.md
- Pipeline hookup decisions: see phase-8/findings.md
