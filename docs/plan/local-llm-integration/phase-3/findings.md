# Phase 3 Findings: Replace Haiku with GLM

> [Back to Phase 3 README](./README.md)

## Research Summary

### 1. LLM_BACKEND Routing (llm.ts)

**File:** `packages/shared/src/lib/llm.ts`

**Flow:**

1. `LLM_BACKEND = process.env.LLM_BACKEND || "ollama"`
2. `USE_SANDBOX = process.env.OLLAMA_SANDBOXED === "1"`
3. **runLLM(prompt, source):**
   - If `LLM_BACKEND === "haiku"` → `runHaiku(prompt, source)`
   - Else if `USE_SANDBOX` → `runOllamaSandboxed(prompt, source)` → wait for approval
   - Else → `directOllama.runOllama(prompt)` (no source param)
4. **runLLMJSON<T>(prompt, source):**
   - If `LLM_BACKEND === "haiku"` → `runHaikuJSON<T>(prompt, source)`
   - Else → `runLLM(prompt, source)` then regex-parse JSON from result

**Exports:** `runLLM`, `runLLMJSON`, `getEmbedding`, `batchEmbed`, `forJobGolem`, `forNightShift`, `forEmailGolem`, `runOllama` (alias), `runOllamaJSON` (alias).

---

### 2. Haiku Interface (cloud-llm.ts)

**File:** `packages/shared/src/lib/cloud-llm.ts`

| Function | Signature | Behavior |
|----------|-----------|----------|
| `runHaiku` | `(prompt: string, source = "unknown") => Promise<string>` | Calls Anthropic `messages.create`, returns trimmed text. Tracks usage. |
| `runHaikuJSON` | `(prompt: string, source = "unknown") => Promise<T \| null>` | Calls runHaiku, regex-extracts `{...}`, parses JSON. |

**Features:**
- Usage tracking (input/output tokens, cost logged to `api_costs.jsonl`)
- `getUsageStats()`, `getUsageBySource()`
- Single user message (no system prompt)
- No streaming
- No tool use

---

### 3. Ollama Interface (ollama-helper.ts)

**File:** `packages/shared/src/lib/ollama-helper.ts`

| Function | Signature | Behavior |
|----------|-----------|----------|
| `runOllama` | `(prompt: string) => Promise<string>` | Spawns `ollama run MODEL`, stdin=prompt, returns stdout. |
| `runOllamaJSON` | `(prompt: string) => Promise<T \| null>` | Calls runOllama, regex-extracts `{...}`, parses JSON. |

**Differences from Haiku:**
- No `source` parameter (tracking not implemented)
- Uses CLI spawn, not HTTP
- Model: `OLLAMA_MODEL || "qwen2.5-coder:7b"` (line 5)

---

### 4. Interface Compatibility

| Aspect | Haiku | Ollama | Compatible? |
|--------|-------|--------|-------------|
| runLLM signature | `(prompt, source)` | `(prompt)` | Yes — llm.ts passes source to Haiku; Ollama ignores it |
| runLLMJSON signature | `(prompt, source)` | `(prompt)` | Yes — same |
| Return type | string | string | Yes |
| JSON extraction | Regex `\{[\s\S]*\}` | Same | Yes |
| Usage tracking | Yes | No | Missing in Ollama — cost tracker would not log |

**Conclusion:** Interfaces are compatible. Setting `LLM_BACKEND=ollama` (or new `glm`) would work for all consumers that use `runLLM`/`runLLMJSON` via llm.ts.

---

### 5. What Breaks When Switching?

| Feature | Used? | Impact |
|---------|-------|--------|
| Streaming | No | None |
| Tool use | No | None |
| System prompts | No (single user message) | None |
| Usage tracking | Yes (cloud-llm) | Ollama path doesn't log to cost tracker. Phase 3 plan: add GLM usage logging (tokens, latency) with `tier: "free"`. |
| Source attribution | Yes (logCost per source) | Ollama/GLM would need to pass source through and log |

**Potential issues:**
- **Quality:** GLM may score/classify differently than Haiku. Phase 1 benchmarks should validate.
- **Latency:** Local Ollama may be slower or faster depending on hardware.
- **Railway:** Cloud worker uses `LLM_BACKEND=haiku` — no Ollama on Railway. Switching local only; cloud stays Haiku.

---

### 6. Default Model Configuration

| File | Default Model | Line |
|-----|----------------|------|
| `ollama-helper.ts` | `OLLAMA_MODEL \|\| "qwen2.5-coder:7b"` | 5 |
| `ollama-sandboxed.ts` | `OLLAMA_MODEL \|\| "qwen3-coder-64k"` | 14 |
| `ollama-chat-bot.ts` | `OLLAMA_MODEL \|\| "qwen3-coder-64k"` | 23 |

**To switch to glm-4.7-flash:** Set `OLLAMA_MODEL=glm-4.7-flash` in env. Or add `LLM_BACKEND=glm` that uses a dedicated `glm-llm.ts` with hardcoded `glm-4.7-flash` (bypassing `OLLAMA_MODEL` for that path).

---

### 7. thread-compactor Bypass

**File:** `packages/services/src/thread-compactor.ts`

**Import (line 14):** `import { runOllama, getEmbedding } from "@golems/shared/lib/ollama-helper"`

**Routing:** Imports `ollama-helper` directly. Does **not** go through `llm.ts`. Ignores `LLM_BACKEND`.

**Model used:** `OLLAMA_MODEL || "qwen2.5-coder:7b"` (from ollama-helper).

**Implication:** To use GLM for thread compaction, either:
1. Set `OLLAMA_MODEL=glm-4.7-flash` globally (affects all ollama-helper consumers), or
2. Change thread-compactor to import from llm.ts and add `LLM_BACKEND=glm` support there, or
3. Add a separate `OLLAMA_SUMMARIZE_MODEL` and use it only in thread-compactor.

---

## Decisions

1. **Phase 3 approach:** Add `LLM_BACKEND=glm` as a new option that routes to a new `glm-llm.ts` (Ollama HTTP, model `glm-4.7-flash`). Keeps `ollama` as generic Ollama with `OLLAMA_MODEL`.
2. **thread-compactor:** Either switch to llm.ts (and thus LLM_BACKEND) or document that it uses `OLLAMA_MODEL` separately.
3. **Usage tracking:** glm-llm.ts should log to cost-tracker with `tier: "free"` for parity with Haiku logging.

---

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Create glm-llm.ts (Ollama HTTP, model glm-4.7-flash) | Cursor | Done |
| Add LLM_BACKEND=glm to llm.ts | Cursor | Done |
| Update helpers.ts fallback chain (glm before haiku) | Claude | Done |
| Update exploration.ts with glm agent | Claude | Done |
| Update agent-runner.ts with glm option | Claude | Done |
| Update tests (helpers.test.ts, agent-runner.test.ts) | Claude | Done |
| Decide thread-compactor routing | — | Deferred (separate concern) |
| Set LLM_BACKEND=glm in .env | User | Pending (gitignored) |
| Test email + job scoring with GLM | — | Integration (after merge) |

## Cursor Implementation Notes (2026-02-12)

Cursor created `packages/shared/src/lib/glm-llm.ts` (92 lines) with:
- `runGLM(prompt, source?)` — Ollama HTTP at 127.0.0.1:11434
- `runGLMJSON<T>(prompt, source?)` — Same + JSON regex parsing
- Cost tracking via logCost with `tier: "free"`, uses Ollama's `eval_count` for output tokens
- Model hardcoded to `glm-4.7-flash` (not `OLLAMA_MODEL`)

And updated `packages/shared/src/lib/llm.ts`:
- Added `import { runGLM, runGLMJSON } from "./glm-llm"`
- Added `LLM_BACKEND === "glm"` branch in both `runLLM()` and `runLLMJSON()`
- Added startup log: `[LLM] Using GLM mode (glm-4.7-flash via Ollama)`

---

## Notes

- ollama-sandboxed uses `qwen3-coder-64k` by default; ollama-helper uses `qwen2.5-coder:7b`. Inconsistent defaults. GLM as new default would unify.
- jobs mcp-server uses `runHaiku` directly (cover letter) — it bypasses llm.ts. Phase 3 would need to either: (a) change mcp-server to use llm.ts, or (b) add GLM support to that specific call path.
