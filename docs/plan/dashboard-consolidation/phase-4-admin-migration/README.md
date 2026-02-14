# Phase 4: Admin Migration

> [Back to main plan](../README.md)

## Goal
Migrate all useful functionality from `etanheyman.com/admin/golem/*` into `dashboard.etanheyman.com`, then delete the admin routes from the portfolio repo.

## Tools
- **Research:** gemini — review each admin page for reusable logic
- **Code:** cursor/opus — dashboard pages + portfolio cleanup
- **Design:** **`/frontend-design` skill** (MANDATORY) — for notifications page and Night Shift page UI
- **MCPs:** supabase

## Steps

1. **Audit admin pages** — Read each of the 8 admin pages and document what data they show, what actions they support, and what Supabase tables they query. Write findings to `findings.md`.
2. **Map admin features to dashboard** — For each admin feature, decide: merge into existing dashboard page, create new page, or drop (not useful).
3. **Migrate Monitor page** → ops page (service health + monitoring already exists there)
4. **Migrate Alerts page** → new `/notifications` page in dashboard (notification history, config). **USE `/frontend-design` SKILL.**
5. **Migrate Night Shift page** → section in ops page or standalone `/nightshift` page (run history, target repos, last commits). **USE `/frontend-design` SKILL.**
6. **Delete admin routes from portfolio** — Remove `app/(portfolio)/admin/golem/` directory and all sub-pages. Remove NextAuth if only used for admin.
7. **Delete golems route group from portfolio** — Remove `app/(golems)/` route group and `content/golems/` docs (moved in Phase 6).
8. **Verify portfolio still builds** — `cd ~/Gits/etanheyman.com && npm run build`

## Depends On
- Phase 3 (service monitoring should be in place before migrating monitor page)

## Status
- [x] Audit admin pages
- [x] Map features to dashboard
- [x] Migrate Monitor → ops (done in Phase 3)
- [x] Migrate Alerts → notifications (`/frontend-design`)
- [x] Migrate Night Shift → ops section (`/frontend-design`)
- [x] Delete admin routes (portfolio PR #31)
- [x] Delete golems route group (portfolio PR #31, kept content/golems/ for Phase 6)
- [x] Verify portfolio build
