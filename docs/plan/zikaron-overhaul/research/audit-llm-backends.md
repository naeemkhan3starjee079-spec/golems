# LLM Backend Audit — Monorepo

> Complete map of LLM API calls, switching logic, and abstraction layers. Prepared for adding Gemini 2.5 Flash-Lite Batch API path for bulk enrichment without breaking local inference.

**Date:** 2026-02-16

---

## 1. Files That Make LLM API Calls

### 1.1 Via Shared LLM Facade (`runLLM` / `runLLMJSON`)

| Package | File | Function | Task |
|---------|------|----------|------|
| **shared** | `email/scorer.ts:251` | `runLLMJSON` | Email scoring (1-10), category, subscription extraction |
| **shared** | `email/router.ts` | (indirect via scorer) | Email routing |
| **content** | `pipeline/router.ts:136` | `runLLMJSON` | AI-powered idea → pipeline selection |
| **teller** | `categorizer.ts:45` | `runLLMJSON` | Expense categorization (IRS Schedule C) |
| **teller** | `alerts.ts:34` | `runLLMJSON` | Payment failure detection + extraction |
| **jobs** | `matcher.ts:60` | `forJobGolem.runLLMJSON` | Job matching (1-10), reason, highlights |

All of these go through `packages/shared/src/lib/llm.ts` and respect `LLM_BACKEND`.

### 1.2 Direct Backend Imports (Bypass `llm.ts`)

| Package | File | Import | Task |
|---------|------|--------|------|
| **jobs** | `mcp-server.ts:650` | `runHaiku` from `cloud-llm` | Cover letter generation — **always Haiku** |
| **coach** | `coaching-engine.ts:192` | `runCloudFree` from `vercel-llm` | Daily coaching advice — **always Gemini/Groq** |
| **shared** | `glm/mcp-server.ts:128,184` | `runGLM`, `runGLMJSON` from `glm-llm` | MCP tools: summarize, score — **always GLM** |
| **shared** | `lib/helpers.ts:264-266` | `runHaiku`, `runGLM` from cloud/glm-llm | CLI helper fallback chain (haiku, glm) |

### 1.3 Python / Shell (Outside Shared Abstraction)

| Location | Mechanism | Task |
|----------|-----------|------|
| **zikaron** | `pipeline/enrichment.py:call_glm` | Direct `requests.post` to Ollama HTTP | Chunk enrichment (summary, tags, importance, intent) |
| **scripts** | `summarize-file.sh` | `curl` to `$OLLAMA_URL/api/generate` | File summarization |
| **scripts** | `batch-score-emails.ts` | Direct `fetch` to Ollama | Batch email scoring |

### 1.4 Other LLM Usage (Non-Generative or Specialized)

| Package | File | Model | Task |
|---------|------|-------|------|
| **services** | `validation-service.ts` | Claude Sonnet 4 (Anthropic) | Validates sandboxed Ollama outputs |
| **services** | `ollama-chat-bot.ts` | `ollama` npm SDK | Telegram chat bot |
| **services** | `thread-compactor.ts` | `runOllama` (ollama-helper) | Conversation summarization |

---

## 2. LLM_BACKEND Switching Logic

### 2.1 Main Router: `packages/shared/src/lib/llm.ts`

```
LLM_BACKEND (env, default: "ollama")
    │
    ├─ "haiku"     → runHaiku / runHaikuJSON (cloud-llm.ts)
    ├─ "glm"       → runGLM / runGLMJSON (glm-llm.ts)
    ├─ "gemini"    → runCloudFree / runCloudFreeJSON (vercel-llm.ts)
    ├─ "groq"      → runCloudFree / runCloudFreeJSON (vercel-llm.ts)
    ├─ OLLAMA_SANDBOXED=1 → sandboxed Ollama (ollama-sandboxed.ts)
    └─ "ollama"    → directOllama.runOllama (ollama-helper.ts)
```

### 2.2 Backend Implementations

| File | Backend | API | Model |
|------|---------|-----|-------|
| `cloud-llm.ts` | Haiku | Anthropic SDK `messages.create` | claude-haiku-4-5-20251001 |
| `glm-llm.ts` | GLM | Ollama HTTP `POST /api/generate` | glm-4.7-flash |
| `vercel-llm.ts` | Gemini / Groq | Vercel AI SDK `generateText` | gemini-2.5-flash-lite, meta-llama/llama-4-scout-17b-16e-instruct |
| `ollama-helper.ts` | Ollama | CLI `ollama run` spawn | OLLAMA_MODEL \|\| qwen2.5-coder:7b |
| `ollama-sandboxed.ts` | Sandboxed Ollama | HTTP `POST /api/generate` | OLLAMA_MODEL \|\| qwen3-coder-64k |

### 2.3 Unified Interface

All backends expose the same signature:

```ts
runLLM(prompt: string, source?: string): Promise<string>
runLLMJSON<T>(prompt: string, source?: string): Promise<T | null>
```

`vercel-llm.ts` adds fallback: if primary (Gemini or Groq) returns 429, it tries the other provider.

---

## 3. Enrichment Pipeline — LLM Call Path

### 3.1 Does Enrichment Use Shared Abstractions?

**No.** The Zikaron enrichment pipeline is **Python** and calls **Ollama directly**:

```
packages/zikaron/src/zikaron/pipeline/enrichment.py
    enrich_batch() → call_glm(prompt)
        → requests.post(OLLAMA_URL, json={...})
```

| Constant | Value | Configurable? |
|----------|-------|---------------|
| `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` | **No** — hardcoded |
| `MODEL` | `os.environ.get("ZIKARON_ENRICH_MODEL", "glm-4.7-flash")` | Yes via `ZIKARON_ENRICH_MODEL` |
| Request body | `{"model": MODEL, "prompt": prompt, "stream": False, "think": False}` | Ollama-specific |
| Response | `data.get("response", "")` | Ollama-specific |
| Token counts | `prompt_eval_count`, `eval_count` | Ollama-specific |

### 3.2 Implications for Gemini Batch

- Enrichment is **completely separate** from the shared TypeScript LLM stack.
- Adding a Gemini Batch path requires either:
  1. **New Python path** in `enrichment.py`: e.g. `call_gemini_batch()` that uses Google Batch API, or
  2. **Hybrid**: Export unenriched chunks → TypeScript/Railway script → Gemini Batch API → write results back to DB.

The existing local GLM path can remain untouched; the Batch path would be a **parallel entry point** (e.g. `--backend gemini-batch` or a separate script).

---

## 4. GLM MCP Server — Interface

**File:** `packages/shared/src/glm/mcp-server.ts`

### 4.1 Tools Exposed

| Tool | Input | Output | Implementation |
|------|-------|--------|----------------|
| `glm_summarize` | `text`, `maxSentences` (default 3) | Summary string | `runGLM(prompt, "glm-mcp-summarize")` |
| `glm_score` | `text`, `prompt`, `schema` | JSON object | `runGLMJSON(prompt, "glm-mcp-score")` |

### 4.2 Invocation

```json
{
  "golems-glm": {
    "command": "bun",
    "args": ["run", "packages/shared/src/glm/mcp-server.ts"]
  }
}
```

### 4.3 Backend

Always uses `glm-llm.ts` (Ollama HTTP, glm-4.7-flash). Does **not** go through `llm.ts` or `LLM_BACKEND`. To add Gemini as an option for MCP, you’d need either:

- A new `gemini-mcp-server.ts` that uses `runCloudFree`, or
- A `LLM_BACKEND`-aware MCP that switches between GLM and Gemini.

---

## 5. Environment Variables — LLM Routing

### 5.1 Backend Selection

| Variable | Values | Default | Effect |
|----------|--------|---------|--------|
| `LLM_BACKEND` | `ollama`, `haiku`, `glm`, `gemini`, `groq` | `ollama` | Routes `runLLM`/`runLLMJSON` in llm.ts |
| `OLLAMA_SANDBOXED` | `1` | — | Enables sandboxed Ollama (validation queue) |

### 5.2 Model & Host

| Variable | Used By | Default |
|----------|----------|---------|
| `OLLAMA_MODEL` | ollama-helper, ollama-sandboxed, ollama-chat-bot | `qwen2.5-coder:7b` (direct), `qwen3-coder-64k` (sandboxed) |
| `OLLAMA_HOST` | ollama-chat-bot | `http://localhost:11434` |
| `OLLAMA_URL` | ollama-sandboxed, scripts | `http://127.0.0.1:11434` |
| `ZIKARON_ENRICH_MODEL` | zikaron enrichment.py | `glm-4.7-flash` |

### 5.3 API Keys

| Variable | Required For |
|----------|--------------|
| `ANTHROPIC_API_KEY` | `LLM_BACKEND=haiku` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `LLM_BACKEND=gemini` |
| `GROQ_API_KEY` | `LLM_BACKEND=groq` |

### 5.4 Hardcoded URLs (Not Env)

| File | Constant | Value |
|------|----------|-------|
| `glm-llm.ts` | `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` |
| `enrichment.py` | `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` |
| `ollama-helper.ts` | Embeddings | `http://127.0.0.1:11434/api/embeddings` |

---

## 6. Token Counting, Cost Tracking, Usage Logging

### 6.1 Cost Tracker (`packages/shared/src/lib/cost-tracker.ts`)

- **Dual-write:** Local JSONL (`api_costs.jsonl`) + Supabase `llm_usage` table
- **Format:** `{ timestamp, model, source, input_tokens, output_tokens, cost_usd, tier }`
- **Tiers:** `paid`, `free`, `subscription`

All TypeScript backends (cloud-llm, glm-llm, vercel-llm, ollama-helper) call `logCost()`.

### 6.2 Axiom Observability (`packages/shared/src/lib/axiom.ts`)

- `logLLMCall(event)` — sends to Axiom dataset
- Fields: `model`, `source`, `backend`, `input_tokens`, `output_tokens`, `cost_usd`, `duration_ms`, `tier`, `success`
- Used by: cloud-llm, glm-llm, vercel-llm (fire-and-forget)

### 6.3 Per-Backend Tracking

| Backend | Token Source | Cost |
|---------|--------------|------|
| **Haiku** | `response.usage` from API | $0.80/MTok in, $4.00/MTok out |
| **GLM** | `prompt_eval_count`, `eval_count` from Ollama; input estimated | $0 (tier: free) |
| **Gemini/Groq** | `result.usage` from Vercel AI SDK | $0 (tier: free) |
| **Ollama** | Estimated: `prompt.length/4`, `output.length/4` | $0 (tier: free) |

### 6.4 Zikaron Enrichment

- `_log_glm_usage()` in `enrichment.py` posts to Supabase `llm_usage` (model, source="enrichment", input_tokens, output_tokens, cost_usd=0, tier="free", duration_ms)
- Uses Ollama response fields: `prompt_eval_count`, `eval_count`

---

## 7. Abstraction Layers — Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONSUMERS                                                                   │
│ scorer, matcher, categorizer, alerts, content/router, teller                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ llm.ts (LLM_BACKEND router)                                                 │
│ runLLM / runLLMJSON                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ cloud-llm    │ │ glm-llm     │ │ vercel-llm   │ │ ollama-helper /      │
│ (Haiku)      │ │ (GLM/Ollama) │ │ (Gemini/Groq)│ │ ollama-sandboxed     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘
         │              │              │
         └──────────────┴──────────────┴──► cost-tracker, axiom
```

**Bypass llm.ts:**
- jobs/mcp-server (cover letter) → cloud-llm
- coach → vercel-llm
- glm/mcp-server → glm-llm
- helpers (agent-runner) → cloud-llm, glm-llm

**Outside TypeScript:**
- zikaron enrichment.py → Ollama HTTP (direct)

---

## 8. Recommendations for Gemini Batch Enrichment

1. **Keep local path intact:** Zikaron `call_glm()` and `enrichment.py` can stay as-is for ongoing local enrichment.

2. **Add a separate Batch path:** New module or script (Python or TypeScript) that:
   - Exports unenriched chunks to JSONL
   - Submits to Gemini Batch API
   - Polls for completion
   - Parses responses and writes to `chunks` table

3. **Reuse prompt:** `ENRICHMENT_PROMPT` and `parse_enrichment()` logic can be shared; only the HTTP client and response parsing differ.

4. **Usage logging:** Batch results should log to `llm_usage` (or equivalent) with `source="enrichment-batch"`, `tier="paid"` (or appropriate tier for Batch pricing).

5. **Env for Batch:** e.g. `ZIKARON_ENRICH_BACKEND=ollama|gemini-batch` to choose between local and Batch at runtime.
