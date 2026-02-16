# Phase 3 Findings

## Decisions

- [03:15] Used `google.genai` SDK (v1.63.0), NOT deprecated `google.generativeai`
- [03:15] Added 6 new enrichment fields to prompt + parser + DB columns
- [03:20] Structured output via `responseSchema` (JSON Schema mode) — no free-text parsing needed for Gemini
- [03:25] Batch split at ~12,800 chunks per job (9M token budget, 700 avg tokens/prompt)
- [03:30] Added `[cloud]` optional dependency in pyproject.toml for google-genai SDK
- [03:35] Fixed SQL injection in export query — switched to parameterized queries

## Research

- [03:10] `google.generativeai` (v0.8.6) is DEPRECATED — throws FutureWarning, has no `batches` API
- [03:12] `google.genai` (v1.63.0) is the replacement — has `client.batches.create/get`, `client.files.upload/download`
- [03:15] Batch API uses file-based workflow: upload JSONL → create batch → poll → download results
- [03:18] Job states: JOB_STATE_PENDING → JOB_STATE_RUNNING → JOB_STATE_SUCCEEDED/FAILED
- [03:20] 147K chunks eligible for backfill (out of 249K unenriched) — rest are too short or wrong content_type

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Add 6 new DB columns | opus | done |
| Update enrichment prompt (10 fields) | opus | done |
| Update parse_enrichment() | opus | done |
| Build cloud_backfill.py | opus | done |
| Install google-genai SDK | opus | done |
| Dry-run test (5 chunks) | opus | done |
| Quality validation (100 chunks) | user | pending (needs API key) |
| Full backfill run | user | pending (needs API key) |

## Notes

- Cursor CLI audit hung with 0 bytes output (same issue as Phase 2). Killed after 4 min. PR reviewers will catch issues.
- Enrichment now at 4.4% (11,331/260,441). After backfill: should jump to ~95%+.
- The `backfill_data/` directory has a `.gitignore` — JSONL files are transient and large.
