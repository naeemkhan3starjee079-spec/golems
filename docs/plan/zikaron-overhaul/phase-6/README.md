# Phase 6: Audit + Wire-Up Verification

> [Back to main plan](../README.md)

## Goal

Before writing documentation, audit all Phase 1-5 changes to confirm everything is wired up correctly and follows best practices. This catches integration issues before they get documented as "working."

## Tools

- **Research:** Cursor (audit code with GPT-5.2 for best practices)
- **Code:** Claude Opus (fix any issues found)

## Steps

### 1. Audit enrichment pipeline end-to-end
Run Cursor CLI to verify:
- New 10-field prompt produces valid JSON from local GLM
- `parse_enrichment()` handles all field types correctly (arrays, enums, nullables)
- `update_enrichment()` writes all 6 new columns to DB
- Existing 4-field enriched chunks are NOT overwritten by new 10-field runs
- Cloud backfill results import correctly via `update_enrichment()`

### 2. Audit DB schema integrity
- Verify all 6 new columns exist in `_init_db()` ALTER TABLE logic
- Run `PRAGMA integrity_check` on actual DB
- Verify index coverage for new columns (do we need indexes?)
- Check `get_enrichment_stats()` counts new fields

### 3. Audit project consolidation wiring
- Verify `fix_projects` CLI command uses the same mapping as consolidation script
- Check that `classify.py` normalizes project names at index time
- Verify `extract_whatsapp.py` min_char_count is used correctly
- Check for any stale project name references in code

### 4. Audit MLX backend integration (if Phase 4 done)
- Verify MLX and Ollama can coexist without conflicts
- Check environment variable switching works
- Verify fallback behavior (MLX unavailable → Ollama)

### 5. Audit backup coverage
- Verify `backup-golem-system.sh` covers new DB size (~3.2GB)
- Check that WAL checkpoint happens before backup
- Verify iCloud sync for backup target directory

### 6. Run full test suite
```bash
cd packages/zikaron && python -m pytest
```
Fix any failures before proceeding to documentation.

### 7. Local CLI audit (Cursor)
Run comprehensive Cursor audit across all changed files from Phases 1-5:
- Security: SQL injection, path traversal
- Logic: edge cases, error handling
- Performance: N+1 queries, missing indexes
- Consistency: naming patterns, code style

## Depends On

- Phases 1-5 (all implementation phases)

## Status

- [ ] Audit enrichment pipeline end-to-end
- [ ] Audit DB schema integrity
- [ ] Audit project consolidation wiring
- [ ] Audit MLX backend integration
- [ ] Audit backup coverage
- [ ] Run full test suite
- [ ] Local CLI audit (Cursor)
