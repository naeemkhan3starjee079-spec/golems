# Phase 1: Project Consolidation + Worktree Normalization

> [Back to main plan](../README.md)

## Goal

Merge fragmented project names in Zikaron DB and add normalization at index time to prevent future fragmentation from sub-packages and worktrees.

## Tools

- **Research:** Done — [audit-project-consolidation.md](../research/audit-project-consolidation.md), [audit-worktree-workflow.md](../research/audit-worktree-workflow.md)
- **Code:** Claude Opus (Python edits in packages/zikaron/)

## Steps

### 1. Full backup (off-disk + local)
```bash
# Off-disk backup to iCloud first
bash packages/ralph/scripts/backup-golem-system.sh

# Local backup for fast rollback
cp ~/.local/share/zikaron/zikaron.db ~/.local/share/zikaron/zikaron.db.backup-$(date +%Y%m%d)

# Verify both exist
ls -lh ~/Library/Mobile\ Documents/com~apple~CloudDocs/golem-backup-*/zikaron/
ls -lh ~/.local/share/zikaron/zikaron.db.backup-*
```

### 2. Create consolidation script (with rollback)
New: `packages/zikaron/scripts/consolidate_projects.py`

Merge mappings (from audit):
- **golems** ← 14 variants (sub-packages, pre-monorepo, standalone names)
- **domica** ← 4 variants (worktrees, path diffs)
- **songscript** ← 5 variants (nightshift, path diffs)
- Regex for worktree suffixes: `*-nightshift-\d+`, `*-worktrees-*`

Script features:
- `--dry-run` (default): show counts per table, no changes
- `--execute`: apply UPDATEs to `chunks`, `session_context`, `file_interactions`, `topic_chains`
- **`--generate-rollback`**: export old→new mappings to `rollback.sql` (run before --execute)
- Log rows updated per table
- Integrity check after execution: `PRAGMA integrity_check`

### 3. Add `get_canonical_project()` to indexer
In `cli/__init__.py`, new function called during `index_fast`:
1. Strip path prefix (reuse `_clean_project_name`)
2. Detect git worktree → resolve to parent repo
3. Detect sub-package of monorepo → use repo root
4. Apply static merge mappings as fallback

### 4. Fix git_overlay project format inconsistency
`session_context.project` uses `Gits/golems` format, `chunks.project` uses slug format. Align `git_overlay.py` to use `get_canonical_project()`.

### 5. Wire as CLI command
Add `zikaron consolidate` subcommand wrapping the script.

### 6. Fix `resp` undefined bug
`enrichment.py:111` — `_log_glm_usage` references `resp` never assigned. Fix: assign `resp = requests.post(...)`.

### 7. Run + verify
- Dry-run, check counts
- Execute
- Verify: `zikaron stats` (project count 34 → ~10), MCP search, dashboard

## Depends On

- None (first phase)

## Status

- [ ] Backup DB
- [ ] Create consolidation script with merge mappings
- [ ] Add `get_canonical_project()` to indexer
- [ ] Fix git_overlay project format inconsistency
- [ ] Wire `zikaron consolidate` CLI command
- [ ] Fix `resp` undefined bug in `_log_glm_usage`
- [ ] Run consolidation (dry-run then execute)
- [ ] Verify search, stats, dashboard
