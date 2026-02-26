# Dashboard RPC + Docs Sync

> Fix dashboard 1000-row cap with Postgres RPCs, add Claude Code usage tracking, single-source docs across repos.

**Audit data:** `docs-audit-results/` (11 files from Cursor IDE audits, 2026-02-17)

---

## Progress

| # | Phase | Folder | Status | Branch | PR |
|---|-------|--------|--------|--------|-----|
| 1 | Docs accuracy fixes | [phase-1-docs-fixes](phase-1-docs-fixes/) | DONE | feature/phase1-docs-fixes | #203 |
| 2 | Supabase RPC functions | [phase-2-rpc-functions](phase-2-rpc-functions/) | DONE | feature/phase2-3-rpc-dashboard | #204 |
| 3 | Dashboard query migration | [phase-3-dashboard-queries](phase-3-dashboard-queries/) | DONE | feature/phase2-3-rpc-dashboard | #204 |
| 4 | ccusage integration | [phase-4-ccusage](phase-4-ccusage/) | DONE | feature/phase4-ccusage | #205 |
| 5 | Content sync setup | [phase-5-content-sync](phase-5-content-sync/) | DONE | feature/docs-sync-from-golems | etanheyman.com#36 |
| 6 | Rendering alignment | [phase-6-rendering-align](phase-6-rendering-align/) | DONE | feature/phase6-rendering-align | #206 + etanheyman.com#37 |

---

## Workstreams

### A. Dashboard Performance (Phases 2-3)
Fix the 1000-row Supabase cap. Create Postgres RPC functions for server-side aggregation. Wire dashboard to use them.

### B. Claude Code Usage (Phase 4)
Parse CC JSONL files, sync to `llm_usage` table, show in tokens dashboard alongside API costs.

### C. Docs Single-Sourcing (Phases 1, 5, 6)
Fix accuracy in source-of-truth docs (phase 1), set up content sync mechanism (phase 5), align rendering between repos (phase 6).

---

## Execution Rules

- Each phase = one branch = one PR
- Phases 1-3 are independent of 4-6 (can interleave if blocked)
- Phase 5 depends on Phase 1 (source docs must be accurate before syncing)
- Phase 6 depends on Phase 5 (rendering alignment needs sync mechanism in place)
- Phase 3 depends on Phase 2 (dashboard needs RPCs to exist)
- Phase 4 is fully independent

## Prerequisites

- `~/Gits/etanheyman.com/` must be cloned (needed for Phases 5-6)
- Supabase MCP configured (apply_migration, execute_sql) — see `.claude/rules/tech-supabase.md`
- All 11 audit files exist in `docs-audit-results/`

## Cross-Phase Knowledge

- **Audit data:** `docs-audit-results/1-zikaron.md` through `11-sidebar-nav.md`
- **Supabase project:** `mkijzwkuubtfjqcemorx`
- **Dashboard queries:** `packages/dashboard/src/lib/supabase/queries.ts`
- **Docs full path:** `packages/dashboard/content/docs/` (always use full path, not shorthand `content/docs/`)
- **ccusage script:** `scripts/cc-usage.ts`
- **ccusage approach:** Parse JSONL directly (do NOT use ccusage CLI); reuse `scripts/cc-usage.ts` patterns
- **etanheyman.com repo:** `~/Gits/etanheyman.com/` (must be cloned for Phases 5-6)
- **Docs source of truth:** `packages/dashboard/content/docs/`
- **Docs stale copy:** `~/Gits/etanheyman.com/content/golems/`
