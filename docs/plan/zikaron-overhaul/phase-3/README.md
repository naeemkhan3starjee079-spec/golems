# Phase 3: Gemini Batch Backfill

> [Back to main plan](../README.md)

## Goal

Build a configurable cloud backfill script that exports unenriched chunks, submits to a cloud LLM batch API, and imports results back into the DB. Default backend: Gemini 2.5 Flash-Lite Batch API (~$16 for 251K chunks).

## Tools

- **Research:** Done — [gemini-research.md](../research/gemini-research.md), [audit-enrichment-pipeline.md](../research/audit-enrichment-pipeline.md), [gemini-enrichment-backup.md](../research/gemini-enrichment-backup.md)
- **Code:** Claude Opus (Python script in packages/zikaron/)
- **API:** Google Generative AI (Gemini Batch API)

## Context

From Gemini research:
- Gemini 2.5 Flash-Lite Batch API: $0.05/M input, $0.20/M output (50% batch discount)
- 251K chunks x ~700 tokens avg = ~$16.32 total
- Split into 18-20 batch jobs (10M token limit per job at Tier 1)
- Completion within 24hr window
- Native JSON Schema mode for structured output
- Gemini 2.0 Flash deprecated March 31, 2026 — don't use it

The script should be **backend-configurable** so we could swap in Claude Batch, OpenAI Batch, or other providers later. The enrichment prompt and parse logic stay the same — only the HTTP client and response format differ.

### Expanded Enrichment Schema (from Gemini research)

The backfill should produce **10 fields** — the existing 4 plus 6 new ones:

| Field | Type | Purpose |
|-------|------|---------|
| `summary` | String | One-sentence overview (existing) |
| `tags` | Array | Topic keywords (existing) |
| `importance` | Integer | Value score 1-10 (existing) |
| `intent` | Enum | Developer's primary goal (existing) |
| `primary_symbols` | Array | Classes, functions, files mentioned — enables knowledge graph |
| `resolved_query` | String | Hypothetical question this chunk answers — HyDE-style search |
| `epistemic_level` | Enum | `hypothesis` / `substantiated` / `validated` — regression detection |
| `version_scope` | String | Version or state of system discussed |
| `debt_impact` | Enum | `introduction` / `resolution` / `none` — tech debt tracking |
| `external_deps` | Array | Libraries or external APIs being used |

Token budget: ~280-320 tokens/chunk (within 400-token limit). Cost increase: ~30% more output tokens, still under $25 total.

The 6 new fields require:
- New columns in `chunks` table (migration)
- Updated `ENRICHMENT_PROMPT` to request all 10 fields
- Updated `parse_enrichment()` to handle new fields
- Updated `update_enrichment()` to write new columns

## Steps

### 1. Add new columns to chunks table
Migration to add the 6 new enrichment fields:
```sql
ALTER TABLE chunks ADD COLUMN primary_symbols TEXT;  -- JSON array
ALTER TABLE chunks ADD COLUMN resolved_query TEXT;
ALTER TABLE chunks ADD COLUMN epistemic_level TEXT;  -- hypothesis/substantiated/validated
ALTER TABLE chunks ADD COLUMN version_scope TEXT;
ALTER TABLE chunks ADD COLUMN debt_impact TEXT;       -- introduction/resolution/none
ALTER TABLE chunks ADD COLUMN external_deps TEXT;     -- JSON array
```

### 2. Update enrichment prompt + parser
- Expand `ENRICHMENT_PROMPT` in `enrichment.py` to request all 10 fields
- Update `parse_enrichment()` to extract new fields (with graceful fallbacks)
- Update `update_enrichment()` SQL to write new columns
- This affects BOTH cloud backfill AND ongoing local enrichment

### 3. Build backfill script
New: `packages/zikaron/scripts/cloud_backfill.py`

```
export_unenriched() → JSONL file
    ↓
submit_batch_jobs() → batch IDs
    ↓
poll_for_completion() → download results
    ↓
import_results() → bulk UPDATE chunks
```

Configurable via env/args:
- `--backend gemini|claude|openai` (default: gemini)
- `--model` (default: gemini-2.5-flash-lite)
- `--batch-size` (chunks per job, default: 14000)
- `--dry-run` (export JSONL only, don't submit)
- `--resume` (resume from checkpoint)

### 4. Export unenriched chunks to JSONL
Query: `SELECT id, content, project, content_type FROM chunks WHERE enriched_at IS NULL AND char_count >= 50 AND content_type IN (...)`

Each line:
```json
{"key": "chunk_123", "request": {"contents": [{"parts": [{"text": "<prompt>"}]}], "generationConfig": {"responseMimeType": "application/json", "responseSchema": {...}}}}
```

Reuse the expanded `ENRICHMENT_PROMPT` — all 10 fields.

### 5. Implement Gemini Batch backend
- Upload JSONL via File API
- Create batch with `ai.batches.create()`
- Poll `ai.batches.get()` for `JOB_STATE_SUCCEEDED`
- Download results JSONL
- Parse responses, validate with `parse_enrichment()` logic

### 6. Add checkpoint table
Track progress across batch jobs:
```sql
CREATE TABLE IF NOT EXISTS enrichment_checkpoints (
    batch_id TEXT PRIMARY KEY,
    backend TEXT,
    status TEXT,  -- submitted, completed, failed
    chunk_start INTEGER,
    chunk_end INTEGER,
    submitted_at TEXT,
    completed_at TEXT,
    error TEXT
);
```

### 7. Import results back to DB
Bulk UPDATE:
```python
for result in batch_results:
    chunk_id = result["key"]
    enrichment = parse_enrichment(result["response"])
    store.update_enrichment(chunk_id, **enrichment)
```

With progress bar and error counting.

### 8. Add usage logging
Log to Supabase `llm_usage` with `source="enrichment-batch"`, `tier="paid"`, actual costs.

### 9. Quality validation (pre-flight)
Before full backfill, run 100-chunk sample:
- Submit small batch
- Compare output quality to existing GLM-enriched chunks
- Check: summary length, tag relevance, importance distribution, intent accuracy
- Log comparison to `phase-3/findings.md`

### 10. Run full backfill
- **Backup DB first** (off-disk: `bash packages/ralph/scripts/backup-golem-system.sh`)
- Stop local enrichment
- Export all unenriched chunks (`WHERE enriched_at IS NULL` — never touch already-enriched)
- Submit 18-20 batch jobs
- Poll for completion (~24hr)
- Import results (UPDATE only rows with matching chunk IDs, skip any that got enriched locally in the meantime)
- `PRAGMA integrity_check` after import
- Restart local enrichment for ongoing

### 11. Verify
- `zikaron stats` — enrichment percentage should jump from ~3.5% to ~95%+
- Sample check: read 10 random enriched chunks, verify quality
- Dashboard enrichment stats should update

## Depends On

- Phase 1 (project consolidation — so chunks have clean project names)
- Phase 2 (WhatsApp reindex — so WhatsApp chunks are included in backfill)

## Status

- [ ] Add 6 new columns to chunks table (migration)
- [ ] Update enrichment prompt + parser for 10-field schema
- [ ] Build backfill script architecture
- [ ] Export unenriched chunks to JSONL
- [ ] Implement Gemini Batch backend
- [ ] Add checkpoint table for resume
- [ ] Import results back to DB
- [ ] Add usage logging
- [ ] Quality validation (100-chunk sample)
- [ ] Run full backfill
- [ ] Verify enrichment stats + quality
