# Phase 6: Documentation + Wizard + Doctor

> [Back to main plan](../README.md)

## Goal

Update all documentation, CLAUDE.md files, wizard checks, and doctor health checks to reflect the Zikaron overhaul changes (new enrichment fields, project consolidation, MLX backend, Gemini backfill).

## Tools

- **Research:** Cursor (audit existing docs for stale references)
- **Code:** Claude Opus (edits across multiple files)

## Steps

### 1. Update Zikaron CLAUDE.md
- Add 6 new enrichment fields to the enrichment table
- Document `zikaron consolidate` CLI command
- Update chunk counts (post-enrichment)
- Add MLX backend info (if Phase 4 completed)
- Document WhatsApp reindex status/limitations

### 2. Update Golems root CLAUDE.md
- Update Zikaron description (chunk count, enrichment %)
- Add any new MCP tools or CLI commands

### 3. Update Doctor health checks
File: `packages/services/src/doctor.ts`
- Add check: enrichment progress (% enriched, stale check)
- Add check: project name fragmentation (warn if >15 distinct projects)
- Add check: Ollama/MLX availability for local enrichment
- Add check: Zikaron DB size / integrity

### 4. Update Wizard
File: `packages/services/src/wizard.ts`
- Add setup step for MLX backend (if Phase 4 done)
- Add Ollama model check (glm4 pulled?)
- Add enrichment config (batch size, schedule)

### 5. Update enrichment docs
- Update enrichment prompt documentation with 10-field schema
- Document Gemini Batch API usage and cost tracking
- Add runbook for future backfill operations

### 6. Update backup script docs
- Document WAL-safe backup process
- Add recovery instructions
- Update manifest with new backup targets

### 7. Audit stale references
Use Cursor to grep for stale references:
- Old project names (claude-golem, ralph, etc.)
- Old chunk counts
- Old enrichment field lists (4 fields → 10)
- References to ChatStorage.sqlite path

## Depends On

- Phase 1 (project consolidation)
- Phase 3 (enrichment schema changes)
- Phase 4 (MLX backend — optional)
- Phase 5 (tuning — optional)

## Status

- [ ] Update Zikaron CLAUDE.md
- [ ] Update Golems root CLAUDE.md
- [ ] Update Doctor health checks
- [ ] Update Wizard setup
- [ ] Update enrichment documentation
- [ ] Update backup script docs
- [ ] Audit stale references with Cursor
