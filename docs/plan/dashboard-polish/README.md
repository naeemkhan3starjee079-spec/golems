# Dashboard Polish Plan

> Fix all dashboard bugs and data inaccuracies reported in the Feb 15 2026 review round.

## Context

After the dashboard overhaul (PR #184) and docs refresh (PRs #185-186), a manual review uncovered multiple data accuracy issues, rendering bugs, and UX problems across nearly every dashboard page. This plan fixes them systematically.

## User Feedback Summary

1. **Docs pages** — double H1 headers (layout + markdown), mermaid flowcharts render poorly
2. **Enrichment** — time estimate impossible (4h20m for small batch), percentage calculation wrong (33% when should be lower)
3. **Notifications/Emails** — still capped at 1000 despite PAGE_SIZE=2000 fix
4. **Teller** — Bugbot Pro showing as subscription, IBM gone but wrong entries remain
5. **Coach** — recovery trend, sleep, strain not updating, no calendar events shown
6. **Content** — pipeline diagrams are basic, wants detailed circular flows (Figma gate loop)
7. **Token usage** — Haiku now shows, but no Claude Code CLI or CLI helper tracking

---

## Progress

| # | Phase | Folder | Status | PR |
|---|-------|--------|--------|----|
| 1 | Docs & Rendering | [phase-1-docs-rendering](phase-1-docs-rendering/) | DONE | |
| 2 | Data Accuracy | [phase-2-data-accuracy](phase-2-data-accuracy/) | DONE | |
| 3 | Content Pipeline UX | [phase-3-content-pipelines](phase-3-content-pipelines/) | DONE | |
| 4 | Coach Data Freshness | [phase-4-coach-freshness](phase-4-coach-freshness/) | DONE | |
| 5 | Verification | [phase-5-verification](phase-5-verification/) | DONE | |

---

## Execution Rules

Each phase = one branch = one PR. See `/large-plan` skill for the full protocol.

**Branch naming:** `feature/dash-polish-phase-N`

**Quality gates per phase:**
- `bun run build` passes in `packages/dashboard`
- No TypeScript errors
- All changes visible on `localhost:3000`
- PR review comments addressed before merge

---

## Cross-Phase Knowledge

Update this section as phases complete:
- Docs rendering: see phase-1-docs-rendering/findings.md
- Data queries: see phase-2-data-accuracy/findings.md
- Pipeline diagram components: see phase-3-content-pipelines/findings.md
