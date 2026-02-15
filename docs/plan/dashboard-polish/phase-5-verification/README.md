# Phase 5: Verification & Critique Waves

> [Back to main plan](../README.md)

## Goal

Verify all fixes from Phases 1-4 using critique waves — parallel verification agents check each page against the original user feedback.

## Tools

- **Verification:** `/critique-waves` skill — parallel agents verify each page
- **Browser:** playwright MCP — screenshot each page for visual verification
- **Code:** opus — fix any regressions found

## Context

This phase runs AFTER Phases 1-4 are merged. It's a full sweep to confirm:
1. All user complaints are resolved
2. No regressions introduced
3. Dashboard looks good on both desktop and mobile
4. Data accuracy is correct (query Supabase to cross-check displayed values)

### Original User Complaints (Checklist)
1. Double H1 headers in docs → Phase 1
2. Mermaid flowcharts look bad → Phase 1
3. Enrichment time estimate wrong → Phase 2
4. Enrichment percentage wrong → Phase 2
5. Notifications still capped → Phase 2
6. Emails still capped → Phase 2
7. Bugbot Pro in teller → Phase 2
8. Coach recovery/sleep/strain stale → Phase 4
9. Coach no calendar events → Phase 4
10. Content pipeline diagrams basic → Phase 3
11. Content circular flows missing → Phase 3

### Verification Agents
Launch 3-4 parallel agents, each responsible for a page group:

**Agent 1: Docs Pages**
- Load `/docs/getting-started` — verify single H1, correct package count
- Load `/docs/architecture` — verify mermaid flowchart renders with dark theme
- Check TOC links work, code blocks have syntax highlighting

**Agent 2: Data Pages**
- Load `/enrichment` — verify percentage is non-embedding average, time estimate is reasonable
- Load `/teller` — verify no Bugbot Pro, categories look correct
- Load `/notifications` — verify >1000 events load (if available)
- Load `/emails` — verify >1000 emails load (if available)

**Agent 3: Content & Coach**
- Load `/content` — verify pipeline diagrams have loops, gates are distinct
- Expand each pipeline — check flow diagram renders
- Load `/coach` — verify freshness indicators, stale warning if applicable, calendar placeholder

**Agent 4: Cross-Check (Supabase)**
- Query `enrichment_stats` — verify displayed percentage matches
- Query `subscriptions` — verify displayed list matches active subs
- Query `whoop_snapshots` — verify most recent date matches coach display
- Query `llm_usage` — verify token page shows all models

## Steps

1. Set up critique waves folder with instructions per agent
2. Launch 3-4 parallel verification agents
3. Collect results — each agent writes pass/fail per item
4. Fix any failures found (create bug fix commits)
5. Re-run failed verifications
6. All 11 user complaints verified as resolved
7. Create final PR with any fixes from this phase

## Depends On

- Phase 1 (docs rendering)
- Phase 2 (data accuracy)
- Phase 3 (content pipelines)
- Phase 4 (coach freshness)

## Status

- [x] Set up critique waves (manual code review + Supabase cross-checks)
- [x] Verified via Supabase SQL queries: emails=1064, events=1598, subs=3, whoop=today
- [x] All 11/11 complaints verified as resolved
- [x] No regressions found — build passes, 1148 tests pass
- [x] Final PR ready to push
