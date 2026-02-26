# Phase 14: Dashboard Audit — Fix Missing Data & Miswiring

> [Back to main plan](../README.md)

## Goal
Audit every dashboard page, fix data visibility issues, and ensure all wiring is correct end-to-end.

## Tools
- **Research:** Supabase MCP — check RLS policies, data counts, event types
- **Code:** cursor/opus — fix queries, RLS migrations, deploy
- **MCPs:** supabase, railway

## Findings (Pre-Audit)

### A. RLS Policy Gaps — Tables with NO authenticated SELECT
These tables have data but return empty to the dashboard because RLS blocks `authenticated` role:

| Table | Rows | Missing Policy |
|-------|------|----------------|
| `outreach_contacts` | 8 | No policies at all |
| `outreach_messages` | 8 | No policies at all |
| `subscriptions` | 4 | No policies at all |
| `payments` | 1 | No policies at all |

**Fix:** Add `authenticated SELECT` policy with `(user_id = auth.uid() OR user_id IS NULL)` pattern (matching other tables).

### B. Notifications Event Type Mismatch
The notifications query filters on event types that DON'T MATCH the actual data:

| Query Filter | Actual DB Events |
|-------------|------------------|
| `email_urgent` (0 rows) | `email_routed` (208 rows) |
| `email_triaged` (0 rows) | `telegram_message_out` (62 rows) |
| `service_error` (0 rows) | `telegram_message_in` (52 rows) |
| `service_recovered` (0 rows) | `golem_telegram_chat` (18 rows) |
| `nightshift_*` (0 rows) | `draft_approved` (3 rows) |
| `briefing_sent` (0 rows) | `soltome_post` (3 rows) |
| `job_match` (**1181 rows**) | `pipeline_draft_*` (3 rows) |

**Fix:** Update `fetchNotificationEvents` to include actual event types. Remove pagination cap or add load-more.

### C. Cloud Worker Missing WhoopSync
Railway logs show only EmailGolem, JobGolem, Briefing scheduled. WhoopSync cron (added in PR #181) was never deployed.

**Fix:** `railway up -d` from master (after merging current branch).

### D. Enrichment Not Running
`com.golems.enrichment` launchd service exited. Only 2.9% enriched (7,419/257,492 chunks).

**Fix:** Restart enrichment service, investigate why it stopped.

### E. Coach Page Not in Ops Sidebar
The coach page exists and is in the sidebar nav, but /ops doesn't show coach/whoop service status.

**Fix:** Add WhoopSync to the ops service monitoring view once deployed.

## Steps

1. **Fix RLS policies** — Add `authenticated SELECT` to outreach_contacts, outreach_messages, subscriptions, payments via Supabase migration
2. **Fix notification event types** — Update `fetchNotificationEvents` query to include actual event types (email_routed, telegram_message_*, golem_telegram_chat, draft_approved, soltome_post, pipeline_draft_*)
3. **Remove notification cap** — Add pagination or increase limit from 100
4. **Deploy WhoopSync to Railway** — `railway up -d` after merging to master
5. **Restart enrichment** — `launchctl kickstart -k gui/$(id -u)/com.golems.enrichment`
6. **Add WhoopSync to ops monitoring** — Show coach/whoop service in ops page service list
7. **Verify all pages show data** — Spot-check each page: recruiter, teller, emails, notifications, coach, ops
8. **Check sidebar nav completeness** — Ensure all pages are linked and accessible

## Depends On
- Phase 10 (docs refresh provides context for what each page should show)

## Status
- [x] Fix RLS policies (migration) — Added authenticated SELECT to 4 tables + emails + email_senders (PR #183 + #184)
- [x] Fix notification event types — Added email_routed, telegram_*, golem_telegram_chat, draft_approved, soltome_post, pipeline_draft_*
- [x] Remove notification cap / add pagination — Cursor-based pagination (500/page), "Load More" button
- [x] Deploy WhoopSync to Railway — deployed via `railway up -d` after PR #183 merge
- [x] Restart enrichment — launchd service restarted, running (PID 21015)
- [x] Add WhoopSync to ops monitoring — Added whoopsync to SERVICE_CONFIG
- [x] Fix Railway "Inactive" status — Extended check window from 3h to 12h (covers overnight gap)
- [x] Fix tokens view — Added source environment badges (Local/Cloud/CLI), improved labels, added "not tracked" note
- [x] Fix emails page (0 rows) — Added authenticated SELECT to emails + email_senders tables (PR #184)
- [x] Improve teller page — Yearly projection, upcoming payments, data completeness %, categories (PR #184)
- [x] Add coach timeline — Tomorrow's Blueprint (recovery-based), Today's Activity feed (PR #184)
- [x] Fix docs heading sizes — Installed @tailwindcss/typography, h2-h6 now render correctly (PR #184)
- [x] Fix mermaid rendering — Replaced blob URL ESM loader with UMD script from CDN (PR #184)
- [ ] Verify all pages show data — needs Vercel deploy
- [ ] Check sidebar nav completeness — needs Vercel deploy
