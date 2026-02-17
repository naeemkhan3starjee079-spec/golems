# Phase 3: Dashboard Query Migration

> [Back to main plan](../README.md)

## Goal

Wire dashboard `queries.ts` to use RPC functions from Phase 2, and add server-side filtering to emails, jobs, and notifications pages.

## Tools

- **Code:** Opus (self) — TypeScript edits in queries.ts + page components
- **Reference:** `docs-audit-results/6-query-caps.md`, `7-client-aggregation.md`

## Changes

### A. Replace client-side aggregation with RPCs

| Old function | New implementation |
|-------------|-------------------|
| `fetchTokenStats(days)` | `supabase.rpc('get_token_stats', { since })` |
| `fetchEmailStats()` | `supabase.rpc('get_email_stats')` |
| `fetchJobStats()` | `supabase.rpc('get_job_stats')` |
| `fetchPipelineStats()` | `supabase.rpc('get_pipeline_stats')` |
| `fetchLinkedInStats()` | `supabase.rpc('get_linkedin_stats')` |

Each RPC returns JSON matching the existing return type shape. The dashboard pages should need zero changes — only `queries.ts` changes.

### B. Add server-side filtering

**Note:** The core issue is unbounded *stats* queries (`fetchEmailStats`, `fetchJobStats`) that fetch ALL rows with no limit, then aggregate in JS. The *list* queries (`fetchEmails`, `fetchJobs`) already have limits (50, 100) but do client-side filtering that should be SQL WHERE clauses.

| Page | Problem | Target |
|------|---------|--------|
| Emails | `fetchEmailStats` has no limit (hits 1000 cap); `fetchEmails` has limit(50) but filters in JS | Stats → RPC (Part A). List → add `.ilike()` + category param to query |
| Jobs | `fetchJobStats` has no limit; `fetchJobs` has limit(100) but filters in JS | Stats → RPC (Part A). List → add status/source/search params |
| Notifications | `fetchNotificationEvents` has limit(200) but filters by severity/type in JS | Add severity_types + type params to query |

### C. Add missing `.limit()` to unbounded queries

| Function | Fix |
|----------|-----|
| `fetchBacklogItems` | Add `.limit(500)` |
| `fetchOutreachContacts` | Add `.limit(200)` |
| `fetchOutreachMessages` | Add `.limit(500)` |
| `fetchSubscriptions` | Add `.limit(100)` |
| `fetchWhoopSnapshots` | Add `.limit(365)` (1 year max) |

## Type Safety

Update `types/tokens.ts`, `types/emails.ts`, `types/jobs.ts` if RPC return shapes differ from current types. Likely no changes needed if RPCs return the same structure.

## Safety & Verification

These changes modify query logic but are non-destructive (no schema changes, no data mutations):

1. **Build gate:** `bun run build` must pass — catches type mismatches between RPC JSON and TypeScript interfaces
2. **Visual verification:** After each RPC swap, load the dashboard page in browser and confirm data renders (use `/brave` or Playwright snapshot)
3. **Rollback:** Each function change is isolated — revert a single function to restore old behavior
4. **Critique wave (optional):** `/cli-agents` to audit that all `.limit()` additions are correct and no query was missed
5. **`.limit()` additions are additive** — they reduce returned rows but don't change behavior for typical use

## Steps

1. Replace `fetchTokenStats` with `.rpc('get_token_stats')`, verify tokens page works
2. Replace `fetchEmailStats` with `.rpc('get_email_stats')`, verify emails page
3. Replace `fetchJobStats` with `.rpc('get_job_stats')`, verify jobs page
4. Replace `fetchPipelineStats` with `.rpc('get_pipeline_stats')`, verify content page
5. Replace `fetchLinkedInStats` with `.rpc('get_linkedin_stats')`, verify recruiter page
6. Add filter params to `fetchEmails` (category, search) + wire in emails page
7. Add filter params to `fetchJobs` (status, source, search) + wire in jobs page
8. Add filter params to `fetchNotificationEvents` (severity_types, type) + wire
9. Add `.limit()` to 5 unbounded queries
10. Test all dashboard pages render correctly
11. `bun run build` passes (no type errors)

## Depends On

- Phase 2 (RPCs must exist in Supabase before dashboard can call them)

## Status

- [ ] fetchTokenStats → RPC
- [ ] fetchEmailStats → RPC
- [ ] fetchJobStats → RPC
- [ ] fetchPipelineStats → RPC
- [ ] fetchLinkedInStats → RPC
- [ ] Emails server-side filtering
- [ ] Jobs server-side filtering
- [ ] Notifications server-side filtering
- [ ] Add .limit() to unbounded queries
- [ ] Build passes
