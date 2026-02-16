# Phase 6 Findings

## Audit Results

### DB Schema Integrity
- `PRAGMA integrity_check`: OK
- All 6 new columns present: `primary_symbols`, `resolved_query`, `epistemic_level`, `version_scope`, `debt_impact`, `external_deps`
- 260,441 total chunks, 11,625 enriched (4.5%), 0 with new extended fields (expected — backfill not yet run)
- WAL mode active, `busy_timeout = 5000ms` configured

### Project Consolidation
- 9 clean projects (consolidated from 34 in Phase 1):
  - golems: 92,125 | domica: 85,163 | songscript: 38,478 | unknown: 20,421 | rudy-monorepo: 14,531 | subagents: 8,720 | taba: 616 | etanheyman-com: 372 | EtanHey: 15
- Normalization happens at index time via `_normalize_project_name()` in `cli/__init__.py` (line 155)
- `fix_projects` CLI command exists for legacy cleanup
- No stale project references found in codebase

### MLX Backend Integration
- LLM dispatcher (`call_llm`) correctly routes via `ZIKARON_ENRICH_BACKEND` env var
- `call_mlx()` and `call_glm()` are separate functions, dispatcher switches cleanly
- TypeScript: `mlx-llm.ts`, `llm.ts` router, GLM MCP server all wire correctly (no type errors)
- Doctor: MLX check is "warn" status (optional), Ollama check is required
- Daemon: `/health/services` includes MLX status

### Test Suite
- Python: 68 passed, 1 skipped (3.65s)
- TypeScript: 1,148 passed, 0 fail (29.24s)

### PR Review Fixes (committed during audit)
- **HIGH**: Thread-local VectorStore for parallel enrichment (APSW not thread-safe)
- **MEDIUM**: Moved env loading before backend check in `auto-enrich.sh`
- **MEDIUM**: Propagate enrichment exit code instead of masking

### Backup Coverage
- `backup-golem-system.sh` exists and covers zikaron.db
- WAL checkpoint is handled by APSW's `busy_timeout` during backup reads
- DB is ~1.4GB currently (will grow when backfill runs)

## Decisions
- Cursor CLI audit skipped (hanging in previous session, low ROI given all tests pass)
- No additional indexes needed on new columns yet — they're write-once from enrichment

## Notes
- Enrichment pipeline is fully wired: Ollama + MLX backends both work
- Cloud backfill script (`cloud_backfill.py`) ready but requires API key + user approval (~$16)
- The `--parallel` flag uses thread-local DB connections now (safe)
