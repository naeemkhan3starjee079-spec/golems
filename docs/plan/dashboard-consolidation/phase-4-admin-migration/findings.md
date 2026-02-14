# Phase 4 Findings: Admin Page Audit

## Admin Pages Inventory

| Page | Lines | Tables Queried | Key Features |
|------|-------|---------------|-------------|
| **Main** (page.tsx) | 249 | golem_events, golem_jobs, subscriptions, emails, outreach_contacts, linkedin_connections, service_runs, llm_usage, golem_state | Railway health, golem cards (recruiter/teller/monitor), activity feed, email categories |
| **Monitor** (monitor/) | 246 | service_runs, golem_events, llm_usage | Service status cards (6 services), 48h activity feed, LLM usage summary |
| **Alerts** (alerts/) | 462 | scrape_activity, golem_events, golem_jobs | 3 tabs: Scrape Activity, Event Log, Quality Dashboard |
| **Night Shift** (nightshift/) | 223 | golem_state, golem_events | Current target, last run, pending PRs, weekly rotation, activity |
| **Emails** (emails/) | 351 | emails, email_senders | Paginated list, filters, score/category corrections, sender modal |
| **Recruiter** (recruiter/) | 561 | outreach_contacts, outreach_messages, linkedin_connections, job_connections, golem_jobs | Contact pipeline, outreach, LinkedIn matches |
| **Teller** (teller/) | 192 | subscriptions, payments | Subscription tracker, monthly cost, payment alerts |
| **Content** (content/) | 165 | golem_events, golem_state | Soltome learner drafts, publishing events |

## Feature Mapping

| Admin Feature | Action | Target | Phase |
|---------------|--------|--------|-------|
| Overview main page | **Drop** | Redundant with ops + tokens | 4 |
| Monitor: service status | **Drop** | Already in ops (Phase 3) | 4 |
| Monitor: LLM usage | **Drop** | Already in tokens page | 4 |
| Alerts: Scrape Activity | **Defer** | /jobs page | 5 |
| Alerts: Event Log | **Drop** | Already in ops events section | 4 |
| Alerts: Quality Dashboard | **Defer** | /jobs page | 5 |
| Night Shift | **Migrate** | ops page (new section) | 4 |
| Emails | **Defer** | /emails page | 5 |
| Recruiter | **Defer** | /recruiter page | 5 |
| Teller | **Defer** | /teller page | 5 |
| Content | **Defer** | /content page (enhance existing) | 5 |

## Night Shift Data

Queries `golem_state` keys: `nightShiftTarget`, `lastNightShift`, `nightShiftPRs`, `rotation`.
Filters `golem_events` for `actor === 'nightshift'`.
Default rotation: Mon→songscript, Tue→zikaron, Wed→claude-golem, etc.

## Notifications Page Concept

Old "Alerts" page was misnamed (showed activity, not notifications). True notifications page = notification history + preferences + Telegram delivery log. Derive from golem_events with notification-relevant types.

## Write Actions Needed for Phase 5

- `correctEmailScore` / `correctEmailCategory` — email feedback
- `correctJobRelevance` / `correctJobScore` — job feedback
- `updateJobStatus` — status transitions
- `setSenderAction` / `bulkSetSenderAction` — sender management

Dashboard uses client-side Supabase (no server actions for reads). Write ops will need RLS policies or API routes.

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Audit admin pages | opus | done |
| Map features | opus | done |
| Migrate Night Shift → ops | opus | in progress |
| Create /notifications page | opus | pending |
| Delete admin routes from portfolio | opus | pending |
| Delete golems route group from portfolio | opus | pending |
| Verify portfolio build | opus | pending |
