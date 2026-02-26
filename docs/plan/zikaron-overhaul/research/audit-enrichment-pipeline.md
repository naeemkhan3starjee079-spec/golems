# Zikaron Enrichment Pipeline — Complete Audit

> Structured map of all code related to the Zikaron enrichment pipeline. Generated for backfill planning and LLM backend migration.

---

## 1. Enrichment Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ENRICHMENT FLOW                                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  1. SELECTION                                                                     │
│     VectorStore.get_unenriched_chunks(batch_size, content_types)                  │
│     → WHERE enriched_at IS NULL AND char_count >= 50 AND content_type IN (...)   │
│     → ORDER BY rowid DESC, LIMIT batch_size                                      │
│                                                                                   │
│  2. FOR EACH CHUNK (sequential, no parallelism)                                   │
│     a. Optionally fetch context: store.get_context(id, before=2, after=1)        │
│     b. build_prompt(chunk, context_chunks) → truncate content to 4000 chars       │
│     c. call_glm(prompt) → Ollama HTTP POST                                        │
│     d. parse_enrichment(response) → extract JSON, validate                       │
│     e. store.update_enrichment(chunk_id, summary, tags, importance, intent)     │
│     f. On failure: leave enriched_at NULL (retry on next run)                     │
│                                                                                   │
│  3. SYNC (every 5 batches)                                                       │
│     _sync_stats_to_supabase(store) → POST to Supabase enrichment_stats          │
│                                                                                   │
│  4. LOGGING (per call)                                                            │
│     _log_glm_usage(prompt_tokens, completion_tokens, duration_ms)                 │
│     → POST to Supabase llm_usage                                                  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Inventory — packages/zikaron/

| File | Functions / Entry Points | What It Does | Key Parameters / Constants |
|------|--------------------------|--------------|----------------------------|
| **src/zikaron/pipeline/enrichment.py** | `run_enrichment`, `enrich_batch`, `build_prompt`, `call_glm`, `parse_enrichment`, `_sync_stats_to_supabase`, `_log_glm_usage` | Core enrichment logic: select chunks, call LLM, parse JSON, persist | See §3, §4, §5 |
| **src/zikaron/vector_store.py** | `get_unenriched_chunks`, `update_enrichment`, `get_enrichment_stats`, `get_context` | DB layer: query unenriched, update metadata, stats | `min_char_count=50`, `batch_size`, `content_types` |
| **src/zikaron/cli/__init__.py** | `enrich` command, post-index `_sync_stats_to_supabase` | CLI entry: `zikaron enrich`, sync after index | `batch_size=50`, `max_chunks=0`, `no_context` |
| **src/zikaron/daemon.py** | `stats_enrichment`, `health_services` | HTTP: `/stats/enrichment`, Ollama check in `/health/services` | Read-only DB for stats |
| **src/zikaron/mcp/__init__.py** | `zikaron_search` tool | Uses enrichment fields (intent, importance, tags) in search results | Read-only |
| **src/zikaron/pipeline/brain_graph.py** | Session aggregation | Uses `content_type` in session metadata | Read-only |
| **src/zikaron/pipeline/operation_grouping.py** | Operation detection | Uses `content_type` for turn classification | Read-only |

---

## 3. LLM Call Chain

### 3.1 Entry Point

| Location | Function | Invokes |
|----------|----------|---------|
| `enrichment.py:285` | `enrich_batch` | `call_glm(prompt)` |

### 3.2 API Call (Ollama)

| Constant / Param | Value | Hardcoded? |
|------------------|-------|------------|
| `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` | **Yes** — change for different Ollama host |
| `MODEL` | `os.environ.get("ZIKARON_ENRICH_MODEL", "glm-4.7-flash")` | Env override available |
| Request body | `{"model": MODEL, "prompt": prompt, "stream": False, "think": False}` | **`think: false`** critical for GLM-4.7-Flash speed |
| Timeout | `240` seconds | Hardcoded in `call_glm` |

### 3.3 Prompt Template

**Template:** `ENRICHMENT_PROMPT` (enrichment.py:121–154)

```
You are a metadata extraction assistant. Analyze this conversation chunk and return ONLY a JSON object.

CHUNK (from project: {project}, type: {content_type}):
---
{content}
---

{context_section}

Return this exact JSON structure:
{
  "summary": "<one sentence describing what this chunk is about>",
  "tags": ["<tag1>", "<tag2>", ...],
  "importance": <1-10 integer>,
  "intent": "<one of: debugging, designing, configuring, discussing, deciding, implementing, reviewing>"
}

TAG RULES: ...
IMPORTANCE RULES: ...
Return ONLY the JSON object, no other text.
```

**Content truncation:** `content[:4000] + "\n... [truncated]"` if len > 4000  
**Context:** Up to 3 surrounding chunks, each truncated to 1000 chars

### 3.4 Expected JSON Schema

| Field | Type | Validation |
|-------|------|------------|
| `summary` | string | len > 5, capped at 500 chars |
| `tags` | list[str] | lowercase, strip, max 10 |
| `importance` | int/float | clamped 1.0–10.0 |
| `intent` | string | must be in `VALID_INTENTS` |

**Valid intents:** `["debugging", "designing", "configuring", "discussing", "deciding", "implementing", "reviewing"]`

**Success criteria:** Must have both `summary` and `tags`; otherwise `parse_enrichment` returns `None` and chunk is retried.

### 3.5 LLM Backend Migration Checklist

| Change Required | Location |
|-----------------|----------|
| API URL | `OLLAMA_URL` (enrichment.py:29) |
| Model name | `MODEL` env or default (enrichment.py:30) |
| Request format | `call_glm` body (enrichment.py:186) — different APIs use different shapes |
| Response parsing | `call_glm` extracts `data.get("response", "")` — Ollama-specific |
| Token counts | `prompt_eval_count`, `eval_count` — Ollama-specific; other backends need mapping |
| `think` param | GLM-specific; remove for non-GLM models |

---

## 4. HIGH_VALUE_TYPES and content_type Logic

### 4.1 Chunk Selection Filter

| Constant | Value | Location |
|----------|-------|----------|
| `HIGH_VALUE_TYPES` | `["ai_code", "stack_trace", "user_message", "assistant_text"]` | enrichment.py:116 |

**Chunks enriched:** Only those with `content_type IN (ai_code, stack_trace, user_message, assistant_text)`.

**Chunks skipped:**
- `file_read`, `git_diff`, `build_log`, `dir_listing`, `noise`, etc.
- Any chunk with `enriched_at IS NOT NULL`
- Chunks with `char_count < 50` (vector_store default)

### 4.2 Where content_type Is Set

| Stage | File | Notes |
|-------|------|-------|
| Classification | `pipeline/classify.py` | Maps patterns to `ContentType` enum |
| Chunking | `pipeline/chunk.py` | Passes through `content_type` |
| Indexing | `index_new.py`, `vector_store.py` | Stored in `chunks.content_type` |

### 4.3 Override

`enrich_batch(..., content_types=None)` — if `content_types` is passed, it overrides `HIGH_VALUE_TYPES`. CLI does **not** expose this; only `run_enrichment` does via `content_types` param.

---

## 5. Batch Size, Rate Limiting, Parallelism

| Setting | Value | Location |
|---------|-------|----------|
| **Batch size** | 50 (default) | enrichment.py:386, cli:863, scripts |
| **Max chunks** | 0 = unlimited | enrichment.py:385 |
| **Parallelism** | **None** — strictly sequential | enrich_batch loops `for chunk in chunks` |
| **Rate limiting** | None | No sleep, no throttling |
| **Retry on failure** | Implicit — failed chunks keep `enriched_at=NULL` | Next run will retry |
| **DB concurrency** | `PRAGMA busy_timeout = 5000`, 3-attempt retry on `SQLITE_BUSY` | vector_store.py:39, 769–779 |
| **Supabase sync interval** | Every 5 batches | `total_processed % (batch_size * 5) < batch_size` |

---

## 6. Shell Scripts

| Script | Purpose | Key Params |
|--------|---------|------------|
| **scripts/enrichment-window.sh** | Run enrichment for fixed time window, then stop | `[hours]` default 12, `--batch-size 50` |
| **scripts/enrich.sh** | On-demand start/stop | `start [max_chunks]`, `stop`, `status` |
| **scripts/auto-index.sh** | Daily: index + enrich + Taba | `--max=5000`, `--index-only`, `--enrich-only` |

### 6.1 enrichment-window.sh

| Item | Value |
|------|-------|
| Lock file | `/tmp/zikaron-enrichment.lock` |
| Log dir | `~/.golems-zikaron/logs/enrichment.log` |
| DB path | `~/.local/share/zikaron/zikaron.db` |
| CWD | `packages/zikaron` |
| Env | Loads `$HOME/Gits/golems/.env`, `.env.local` for Supabase |
| Command | `PYTHONUNBUFFERED=1 python3 -m zikaron.pipeline.enrichment --batch-size 50` |
| Graceful stop | SIGTERM/SIGINT → kill PID, 10s wait, then kill -9 |

### 6.2 enrich.sh

| Item | Value |
|------|-------|
| PID file | `~/.golems-zikaron/enrich.pid` |
| Log | `~/.golems-zikaron/logs/enrich-on-demand.log` |
| Default max | 5000 chunks |
| Command | `python3 -m zikaron.pipeline.enrichment --batch-size=50 --max=$MAX` |

### 6.3 auto-index.sh

| Item | Value |
|------|-------|
| Default MAX_ENRICH | 5000 |
| Command | `python3 -m zikaron.pipeline.enrichment --batch-size=50 --max=$MAX_ENRICH` |
| Taba | Separate `python3 -m src.enrichment` in ~/Gits/taba (different package) |

---

## 7. Supabase Integration

| Table | Purpose |
|-------|---------|
| `enrichment_stats` | Dashboard visibility — total_chunks, embedded, tagged, summarized, importance_scored, intent_classified, projects, by_intent |
| `llm_usage` | Token tracking — model, source="enrichment", input_tokens, output_tokens, cost_usd=0, tier="free", duration_ms |

**Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — if missing, sync/logging is skipped (best-effort).

---

## 8. Hardcoded Values — LLM Backend Switch

| Value | File:Line | Change for New Backend |
|-------|-----------|------------------------|
| `http://127.0.0.1:11434/api/generate` | enrichment.py:29 | New API base URL |
| `glm-4.7-flash` | enrichment.py:30 | Model name (or env) |
| `"think": False` | enrichment.py:186 | Remove for non-GLM |
| `data.get("response", "")` | enrichment.py:203 | Response field mapping |
| `prompt_eval_count`, `eval_count` | enrichment.py:196–197 | Token count field names |
| `http://127.0.0.1:11434/api/tags` | daemon.py:271, auto-index.sh, enrich.sh | Ollama health check |
| `timeout=240` | enrichment.py:182 | May need tuning |

---

## 9. Known Issues

| Issue | Location | Description |
|-------|----------|-------------|
| **Bug: `resp` undefined** | enrichment.py:111 | `_log_glm_usage` calls `resp.raise_for_status()` but `resp` is never assigned. Should be `resp = requests.post(...)`. |

---

## 10. Quick Reference — Invocation Paths

```
# CLI
zikaron enrich
zikaron enrich --batch-size 50 --max 5000 --no-context --stats

# Module
python -m zikaron.pipeline.enrichment
python -m zikaron.pipeline.enrichment --batch-size=50 --max=5000 --stats

# Scripts
./scripts/enrichment-window.sh 12    # 12h window
./scripts/enrich.sh start 5000       # 5K chunks
./scripts/auto-index.sh --max=5000   # Daily pipeline
```
