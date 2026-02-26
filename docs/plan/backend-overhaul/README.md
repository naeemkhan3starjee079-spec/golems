# Backend Overhaul Plan

> Repo: `golems/packages/autonomous`
> Parallel plan: [`admin-ui-overhaul`](../admin-ui-overhaul/README.md) (etanheyman.com)

## Progress

| Phase | Name | Status | Branch | Provides to Admin UI |
|-------|------|--------|--------|---------------------|
| 1 | Haiku Wiring + Migrations | done | `feature/backend-phase1` | Haiku-scored emails + jobs |
| 2 | Scraping Quality | done | `feature/backend-phase1` | Full job descriptions, activity log data |
| 3 | Email Sender Tracking + Unsubscribe | done | `feature/backend-phase1` | Sender aggregation API, unsubscribe actions |
| 4 | PR Comments Skill | pending | `feature/backend-phase4` | New `/pr-comments` skill for filtered review reading |

## Cross-Plan Dependencies

```
Backend Phase 1 (Haiku) ──────────► Admin UI can show AI-scored data
Backend Phase 2 (Scraping) ───────► Admin UI Phase 3 (Activity Log view)
Backend Phase 3 (Email/Unsub) ────► Admin UI Phase 2 (Sender modal + unsubscribe)
```

## Execution Rules

1. One branch per phase (phases may be batched when tightly coupled, e.g. phases 1-3 in PR #73)
2. Use `cursor agent -p @codebase` for research within each phase
3. Tests must pass before PR
4. Notify on Telegram when phase PR is ready
5. Pass findings to admin-ui plan via `findings.md`
