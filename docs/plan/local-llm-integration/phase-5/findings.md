# Phase 5 Findings

## Decisions

- [2026-02-12] **Schema: same table** — Cursor recommended adding columns to `chunks` table (not separate table). Reasoning: `tags`, `context_summary` already exist as ALTER TABLE columns; avoids JOIN overhead on every search; 1:1 with chunks.
- [2026-02-12] **Gemini disagreed** — recommended separate `chunks_metadata` table for flexibility/performance. We went with Cursor's approach because search query simplicity matters more than re-enrichment flexibility.
- [2026-02-12] **New columns:** `summary TEXT`, `importance REAL`, `intent TEXT`, `enriched_at TEXT`
- [2026-02-12] **Tags storage:** JSON array string in existing `tags TEXT` column. SQLite `json_each()` for filtering.
- [2026-02-12] **Resumability:** `enriched_at IS NULL` = not yet processed. No separate tracking table needed.
- [2026-02-12] **Content filter:** Only HIGH+MEDIUM value types enriched by default (`ai_code`, `stack_trace`, `user_message`, `assistant_text`). Skip noise/dir_listing.
- [2026-02-12] **Batch size:** 50 (Gemini recommended 15 due to KV cache, but GLM-4.7-Flash is MoE with only 3B active params so 50 is fine)
- [2026-02-12] **Timeout:** 120s per request (was 30s, too short when Ollama has contention)
- [2026-02-12] **Context:** 2 chunks before + 1 after target, truncated at 4000 chars

## Research

- [2026-02-12] Gemini: Full research in `/tmp/gemini-enrichment-research.md` (178 lines)
  - Recommended hybrid approach: local GLM for tags/intent/entities, cloud API for summaries/importance
  - Tag taxonomy: multi-faceted (type, language, libs, concepts)
  - Batch size 15 for 30B MoE on M1 Pro 32GB
  - LEFT JOIN for resumability
- [2026-02-12] Cursor: Full research in `docs/plan/local-llm-integration/phase-5/cursor-findings.md`
  - Recommended same-table approach (avoid JOIN overhead)
  - Concrete code suggestions for search() and hybrid_search() filter additions
  - json_each + json_valid guard for tag filtering

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Schema design research | gemini + cursor | done |
| Add columns to vector_store.py | opus | done |
| Create enrichment.py pipeline | opus | done |
| Update search() filters | opus | done |
| Update hybrid_search() filters | opus | done |
| Update MCP server | opus | done |
| Add CLI command | opus | done |
| Delete dead exploration.ts | opus | done |
| Test sample run (100 chunks) | opus | done (26+ enriched, continuing) |
| Evaluate quality | opus | done |
| Full batch run (238K chunks) | — | pending (operational, not PR-blocking) |

## Quality Evaluation (26 chunks reviewed)

**Verdict: PASS** — enrichment quality is consistently accurate.

### Sample Results (sorted by importance)
| Importance | Intent | Project | Summary |
|-----------|--------|---------|---------|
| 9/10 | debugging | songscript | React infinite loop in `<button>` component from useEffect deps |
| 8/10 | debugging | domica | Map markers fail to display after panning |
| 8/10 | debugging | claude-golem | Python SIGSEGV crash report on macOS |
| 7/10 | implementing | claude-golem | ralph-setup.zsh wizard with MCP config |
| 7/10 | reviewing | domica | Design refinements + Next.js image optimization warning |
| 5/10 | implementing | domica | Unit tests for AutocompleteInput component |
| 3/10 | debugging | domica | Console warning: missing aria-describedby |

### Intent Distribution
- implementing: 11 (42%)
- debugging: 8 (31%)
- reviewing: 1 (4%)
- (more with continued enrichment)

### Observations
- **Summaries** are concise and accurate, capturing the essence of each chunk
- **Tags** use the multi-faceted taxonomy correctly (language + framework + concept)
- **Importance** scores are well-calibrated: trivial warnings get 3, real bugs get 8-9
- **Intent** classification matches the actual activity in each chunk
- **Speed**: ~20-30s per chunk on M1 Pro (GLM-4.7-Flash cold: 78s, warm: 5-15s)
- **Success rate**: 80%+ (8/10 in first test run, improving after model warmup)

## Notes

- [2026-02-12] APSW logs `SQLITE_ERROR` for existing columns during ALTER TABLE — this is expected behavior, caught by try/except. Not a real error.
- [2026-02-12] Batch scorer and enrichment can't run concurrently — both use GLM via Ollama, causes 30s timeouts under contention.
- [2026-02-12] 238,823 total chunks in DB (up from 226K estimate in plan).
- [2026-02-12] exploration.ts deleted — was dead code from PR #55, superseded by cli-agents skill.
- [2026-02-12] Python stdout buffering issue: use `PYTHONUNBUFFERED=1` when running enrichment in background.
- [2026-02-12] GLM cold load takes 78s — warm up with a simple prompt first before batch runs.
- [2026-02-12] CodeRabbit caught: failed enrichments permanently skipped (fixed), VectorStore not closed on exception (fixed), tags join type safety (fixed).
