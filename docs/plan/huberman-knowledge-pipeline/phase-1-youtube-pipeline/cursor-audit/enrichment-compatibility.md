# Enrichment Compatibility Audit: YouTube Transcript Chunks

> **Audit date:** Feb 17, 2026  
> **Scope:** Will YouTube chunks (`source="youtube"`) get enriched properly by Zikaron's GLM-4.7-Flash pipeline?

---

## Executive Summary

| Category | Verdict |
|----------|---------|
| **BLOCKERS** | None — YouTube chunks will be enriched |
| **ADAPTATIONS** | Prompt and field semantics are code-centric; podcast content will work but produce suboptimal metadata |
| **FREEBIES** | MCP search, daemon, indexing — all support `source="youtube"` with no changes |

---

## 1. Enrichment Pipeline Analysis

### 1.1 Source Filtering

**Does enrichment filter by source?**

**No.** The enrichment pipeline does **not** filter by `source`. It only filters by:

- `enriched_at IS NULL` (unenriched chunks)
- `char_count >= 50`
- `content_type IN (ai_code, stack_trace, user_message, assistant_text)` — `HIGH_VALUE_TYPES`

**Location:** `src/zikaron/pipeline/enrichment.py` lines 519–520, 705–731 (`get_unenriched_chunks` in `vector_store.py`).

**Implication:** YouTube transcript chunks use `content_type="assistant_text"` (per phase-1 recommendations). They **will** be picked up by enrichment. No source-specific exclusion.

---

### 1.2 Fields Enriched

| Field | Purpose | Stored in DB |
|-------|---------|--------------|
| `summary` | 1–2 sentence gist | `summary` |
| `tags` | Topic tags (comma-separated) | `tags` (JSON array) |
| `importance` | 1–10 relevance score | `importance` |
| `intent` | debugging, designing, configuring, discussing, deciding, implementing, reviewing | `intent` |
| `primary_symbols` | Classes, functions, files mentioned | `primary_symbols` |
| `resolved_query` | Hypothetical question this chunk answers (HyDE-style) | `resolved_query` |
| `epistemic_level` | hypothesis, substantiated, validated | `epistemic_level` |
| `version_scope` | Version or system state | `version_scope` |
| `debt_impact` | introduction, resolution, none | `debt_impact` |
| `external_deps` | Libraries/APIs used | `external_deps` |

---

### 1.3 Source-Specific Logic

**Is there different logic for whatsapp vs claude_code?**

**No.** A single prompt template (`ENRICHMENT_PROMPT`) is used for all chunks. No branching on `source` or `content_type`.

---

## 2. Enrichment Prompt Analysis

### 2.1 Template Location

`src/zikaron/pipeline/enrichment.py` lines 155–207.

### 2.2 Fit for Podcast Transcript Chunks

| Aspect | Assessment |
|--------|------------|
| **Content type** | Prompt says "CHUNK (from project: {project}, type: {content_type})" — `assistant_text` is passed through. No problem. |
| **Spoken vs code** | Prompt is written for **code conversations**. Examples and rules assume coding context. |
| **Importance scoring** | Rules are code-centric: "1–3: Trivial (greetings, file listings)", "7–9: High (bug fixes, architecture decisions)", "10: Critical (security fixes, production incidents)". Educational content (e.g. Huberman explaining sleep science) has no clear mapping. |
| **Intent classification** | Valid intents: `debugging`, `designing`, `configuring`, `discussing`, `deciding`, `implementing`, `reviewing`. For podcasts, only `discussing` fits. LLM may output `explaining`, `teaching`, `presenting` → **dropped** by `parse_enrichment` (must be in `VALID_INTENTS`). Enrichment still succeeds (summary + tags required; intent is optional). |
| **primary_symbols** | "Extract class names, function names, file paths" — not applicable to transcripts. LLM may return empty array or irrelevant names. |
| **resolved_query** | Example: "How do I fix EADDRINUSE errors in Bun?" — code-focused. For transcripts, questions like "What does Huberman say about sleep cycles?" would be more appropriate; LLM can adapt. |
| **epistemic_level** | hypothesis/substantiated/validated — can apply to educational content (e.g. "validated" for cited research). |
| **debt_impact** | introduction/resolution/none — code-specific. Transcripts will likely get `none`. |
| **external_deps** | "Libraries, APIs, services" — not applicable. Transcripts may mention studies, supplements; LLM may adapt or return empty. |
| **TAG RULES** | "language tags (python, typescript), framework tags (react, fastapi), concept tags (error-handling, authentication)" — code-oriented. Transcripts would benefit from tags like `sleep`, `neuroplasticity`, `supplements`. LLM can still produce useful tags. |

### 2.3 Validation Logic (`parse_enrichment`)

- **Required:** `summary` and `tags` — both work for transcripts.
- **Intent:** If LLM returns invalid intent, it is dropped; enrichment is still valid.
- **Other fields:** Optional; missing values are OK.

**Conclusion:** Enrichment will run and succeed for YouTube chunks. Metadata will be usable but not ideal for educational content.

---

## 3. MCP Search

### 3.1 source_filter Parameter

**Location:** `src/zikaron/mcp/__init__.py` lines 79–86.

```python
"source": {
    "type": "string",
    "enum": ["claude_code", "whatsapp", "youtube", "all"],
    "description": "Filter by data source (default: claude_code). Use 'all' to search everything."
}
```

**Verdict:** `"youtube"` is already a valid option. No code changes needed.

### 3.2 Flow

- User passes `source="youtube"` → `source_filter="youtube"` → `store.hybrid_search(source_filter="youtube")`
- `vector_store.py` adds `c.source = ?` to the WHERE clause (lines 306–308, 354–356)

**FREEBIE:** MCP search supports YouTube out of the box.

---

## 4. Dashboard & Stats

### 4.1 Enrichment Page

**Location:** `packages/dashboard/src/app/(dashboard)/enrichment/page.tsx`

**Data source:** Supabase `enrichment_stats` table, populated by `_sync_stats_to_supabase()` in `enrichment.py`.

**Displayed:**

- Total chunks, overall %, needs enrichment, est. time
- Field coverage: embeddings, tags, intent, summaries, importance
- By project (top 8 + others)
- Intent distribution

**Per-source stats?** No. Stats are global and by project, not by `source`.

### 4.2 Would YouTube Chunks Show Up?

- **Total chunks:** Yes — included in `total_chunks`.
- **Projects:** Yes — if `project="huberman"` (or similar), they appear in project breakdown.
- **Intent distribution:** Yes — if intent is valid (e.g. `discussing`), they contribute.
- **Per-source breakdown:** No — dashboard does not show claude_code vs whatsapp vs youtube.

**Verdict:** YouTube chunks are counted and visible via project and intent. No per-source view.

### 4.3 Daemon Stats

`/stats` returns `get_stats()` from vector_store: `total_chunks`, `projects`, `content_types`. No source breakdown.

### 4.4 Dashboard Search

`/dashboard/search` uses FTS5 with optional `project` and `content_type` filters. **No `source` filter.** YouTube chunks are included in search results when they match the query.

---

## 5. Summary: BLOCKERS, ADAPTATIONS, FREEBIES

### BLOCKERS

**None.** YouTube chunks will be enriched. The pipeline does not filter by source, and `content_type="assistant_text"` is in `HIGH_VALUE_TYPES`.

---

### ADAPTATIONS (Recommended)

| Item | Effort | Description |
|------|--------|-------------|
| **Source-aware prompt** | Medium | Add a branch: if `chunk.get("source") == "youtube"`, use a prompt tuned for educational/spoken content (different intent set, importance rules, tag taxonomy). |
| **Intent taxonomy for transcripts** | Low | Add intents like `explaining`, `teaching`, `presenting`, `citing_research` and extend `VALID_INTENTS` when source is youtube, or accept a broader set. |
| **Importance rules for educational content** | Low | Add guidance: "7–9: Key concepts, actionable advice, cited studies; 10: Landmark findings, protocol summaries." |
| **Tag taxonomy for podcasts** | Low | Add rules: "Include: topic tags (sleep, neuroplasticity, supplements), format tags (protocol, study-citation, anecdote)." |

---

### FREEBIES (No Changes Needed)

| Item | Notes |
|------|-------|
| **MCP `source="youtube"`** | Already in enum; search works. |
| **Daemon `/search`** | Accepts `source_filter`; passes through to `hybrid_search`. |
| **Enrichment pickup** | `assistant_text` in HIGH_VALUE_TYPES; no source filter. |
| **Vector store** | `source` column and index exist; `hybrid_search` supports `source_filter`. |
| **Dashboard totals** | YouTube chunks count in total_chunks and project breakdown. |
| **get_context** | Works if `conversation_id` and `position` are set (e.g. `youtube:{video_id}`). |

---

## 6. Recommended Next Steps

1. **Phase 1 (minimal):** Index YouTube transcripts with `content_type="assistant_text"`, `source="youtube"`. Run enrichment as-is. Expect usable but code-biased metadata.
2. **Phase 2 (optional):** Add source-aware prompt in `build_prompt()` / `build_external_prompt()` for `source="youtube"` to improve intent, importance, and tags for educational content.
3. **Phase 3 (optional):** Extend dashboard to show per-source enrichment stats (e.g. claude_code vs youtube) if needed for monitoring.
