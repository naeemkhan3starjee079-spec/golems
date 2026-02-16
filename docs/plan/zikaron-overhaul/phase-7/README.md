# Phase 7: Human-Friendly Documentation + Wizard + Doctor

> [Back to main plan](../README.md)

## Goal

Write clear, human-friendly documentation for all Zikaron overhaul changes. Update wizard and doctor to reflect new capabilities. Then do a second pass to find gaps and polish.

**Key principle:** Docs should read like a colleague explaining things, not like auto-generated API reference. Use examples, explain the "why", and keep it conversational.

## Tools

- **Round 1 (Write):** Claude Opus (write docs, update wizard/doctor code)
- **Round 2 (Verify):** Cursor CLI (read all docs written in Round 1, find gaps, verify accuracy)
- **Round 3 (Polish):** Claude Opus (fix gaps found by Cursor, update wizard/doctor)

## Steps

### Round 1: Write Documentation

#### 1. Update Zikaron CLAUDE.md
- Add 6 new enrichment fields to the enrichment table (with plain-English descriptions)
- Document `zikaron consolidate` CLI command with examples
- Update chunk count and enrichment stats (post-backfill numbers)
- Add MLX backend info (if Phase 4 completed)
- Document WhatsApp reindex status — what worked, what's missing (ChatStorage.sqlite)
- Add cloud backfill runbook (how to run another batch if needed)

#### 2. Update Golems root CLAUDE.md
- Update Zikaron description with new chunk count and enrichment percentage
- Add any new CLI commands or MCP tool changes
- Keep it concise — link to package CLAUDE.md for details

#### 3. Write enrichment runbook
New file: `packages/zikaron/docs/enrichment-runbook.md`
- How ongoing local enrichment works (Ollama + GLM)
- How to run a cloud backfill (Gemini Batch API)
- Cost tracking and budget monitoring
- Troubleshooting common issues (Ollama down, DB locked, stale enrichment)
- 10-field schema reference with examples of good vs bad output

#### 4. Write backup/recovery docs
- Document WAL-safe backup process
- Add recovery instructions (restore from iCloud backup)
- Update manifest with new backup targets

### Round 2: Update Wizard + Doctor

#### 5. Update Doctor health checks
File: `packages/services/src/doctor.ts`
- Add check: enrichment progress (% enriched, stale check — warn if no enrichment in 7 days)
- Add check: project name fragmentation (warn if >15 distinct projects)
- Add check: Ollama/MLX availability for local enrichment
- Add check: Zikaron DB size / integrity
- Make check messages human-friendly ("Your enrichment is at 97% — looking good!")

#### 6. Update Wizard setup
File: `packages/services/src/wizard.ts`
- Add setup step for MLX backend (if Phase 4 done)
- Add Ollama model check (is glm4 pulled?)
- Add enrichment config (batch size, schedule)

### Round 3: Verify + Polish (Cursor reads everything, finds gaps)

#### 7. Cursor doc verification sweep
Run Cursor to read ALL docs written above and check:
- Stale references (old project names, old chunk counts, 4-field schema references)
- Missing cross-references (docs that mention things without linking)
- Accuracy (do the documented commands actually work?)
- Tone check (is it human-friendly or robotic auto-generated?)
- Coverage gaps (any new features not documented?)

#### 8. Fix gaps and polish
Based on Cursor findings:
- Fix stale references
- Add missing examples
- Improve tone where needed
- Ensure wizard/doctor messages match doc tone

## Depends On

- Phase 6 (audit — confirms everything works before we document it)

## Status

- [x] Update Zikaron CLAUDE.md
- [x] Update Golems root CLAUDE.md
- [x] Write enrichment runbook
- [x] Write backup/recovery docs (added to enrichment-runbook.md)
- [x] Update Doctor health checks (MLX, Ollama model, enrichment queue messages)
- [x] Update Wizard setup (Ollama in preflight)
- [x] ~~Cursor doc verification sweep~~ — Cursor hit usage limit; manual sweep done instead
- [x] Fix gaps and polish (stale chunk counts: 226K/238K -> 260K+)
