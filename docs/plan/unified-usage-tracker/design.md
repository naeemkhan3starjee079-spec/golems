# Unified Usage Tracker — Design

> Consolidates CLI agent invocations, Claude Code sessions, Haiku/Ollama/GLM calls into a single queryable usage table.

---

## Current State

### 1. Cost Tracker (`packages/shared/src/lib/cost-tracker.ts`)

- **Dual-write:** Local JSONL (`~/.golems-zikaron/api_costs.jsonl`) + Supabase `llm_usage` table
- **Entry format:**
  ```json
  {
    "timestamp": "ISO8601",
    "model": "claude-haiku-4-5-20251001",
    "source": "email-golem",
    "input_tokens": 100,
    "output_tokens": 50,
    "cost_usd": 0.001,
    "tier": "paid" | "free" | "subscription",
    "duration_ms": 1234
  }
  ```
- **Tiers:** `paid` (Haiku API), `free` (CLI helpers / GLM), `subscription` (CC sessions)
- **Readers:** `getFullUsageStats()`, `getSupabaseUsageStats()`, filters by period (today/week/month/all)

### 2. CLI Helpers (`packages/shared/src/lib/helpers.ts`)

- **Agents:** gemini, cursor, codex, kiro, haiku (fallback chain)
- **Logging:** Every `runHelper()` call logs to cost-tracker when `backend !== "haiku"`:
  - `model` = backend name (gemini, cursor, codex, kiro)
  - `source` = opts.source || "helpers"
  - `tier: "free"`, `input_tokens: 0`, `output_tokens: 0`, `cost_usd: 0`
  - `duration_ms` = actual wall-clock duration
- **Haiku:** Not logged here — cloud-llm.ts logs directly with tokens + cost

### 3. Agent Runner (`packages/shared/src/lib/agent-runner.ts`)

- **Uses:** `runHelper()` + `runWithTimeout()` for research workflows
- **Does NOT log directly** — invocations flow through helpers.ts, so they’re already in api_costs.jsonl
- **Note:** `runCursorResearch()`, `runCursorVerification()` spawn `cursor agent` directly (not via runHelper) — **these are NOT logged today**

### 4. Haiku (`cloud-llm.ts`)

- Logs via `logCost(COST_LOG_PATH, {...})` with `tier: "paid"`, real tokens, real cost

### 5. GLM / Ollama (`glm-llm.ts`)

- Logs via `logCost()` with `tier: "free"`, `cost_usd: 0`, estimated input tokens, `eval_count` for output

### 6. Default Ollama (`ollama-helper.ts`)

- **Does NOT log** — qwen2.5-coder:7b runs untracked. Would need to add cost-tracker integration.

### 7. Claude Code / Cursor Transcripts

- **cc-usage.ts** scans `~/.claude/projects/*/*.jsonl` (Claude Code format)
  - Expects `obj.type === "assistant"` and `msg.usage` with `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`
  - Computes cost from model pricing table
- **Cursor** stores `~/.cursor/projects/*/agent-transcripts/*.jsonl` — different format (`role`/`message`/`content`), **no usage block** in sampled files. Can count sessions/turns but not tokens unless Cursor adds usage later.

---

## Data Sources Summary

| Source                    | Logged To      | Tokens | Cost | Duration |
|---------------------------|----------------|--------|------|----------|
| Haiku API                 | api_costs.jsonl | ✓      | ✓    | -        |
| GLM (Ollama)              | api_costs.jsonl | ✓ (est)| 0    | -        |
| CLI: gemini, cursor, codex, kiro | api_costs.jsonl | 0 | 0 | ✓ |
| CLI: haiku                | api_costs.jsonl | ✓      | ✓    | -        |
| CC transcripts (~/.claude)| Read-only scan | ✓      | ✓ (calc) | -   |
| Cursor transcripts        | Read-only scan | ✗      | -   | -        |
| Agent runner (direct cursor) | **Not logged** | - | - | - |

---

## Target Output Table

```
agent           | calls | tokens | cost   | last_used
----------------|-------|--------|--------|--------------------
claude-code     | 42    | 1.2M   | $12.34 | 2026-02-12 14:32
haiku           | 156   | 89K    | $0.23  | 2026-02-12 14:28
glm-4.7-flash   | 89    | 45K    | $0.00  | 2026-02-12 13:15
gemini          | 23    | -      | $0.00  | 2026-02-12 12:44
cursor          | 8     | -      | $0.00  | 2026-02-11 22:10
codex           | 2     | -      | $0.00  | 2026-02-10 09:00
kiro            | 0     | -      | $0.00  | -
```

Where `agent` is the normalized name (model or helper), `calls` = invocation count, `tokens` = sum of input+output (or `-` if unknown), `cost` = USD, `last_used` = most recent timestamp.

---

## Design

### 1. Unified Entry Shape

Extend `CostEntry` (or introduce `UsageEntry`) to support all sources:

```typescript
interface UsageEntry {
  timestamp: string;       // ISO8601
  agent: string;           // Normalized: haiku, glm, gemini, cursor, codex, kiro, claude-code
  source?: string;         // Calling context: email-golem, helpers, job-golem, etc.
  input_tokens?: number;
  output_tokens?: number;
  cost_usd: number;
  duration_ms?: number;
  session_id?: string;     // For CC/Cursor sessions
  project?: string;        // For CC: Gits/golems, etc.
}
```

### 2. Ingestion Flow

1. **api_costs.jsonl + Supabase** — Keep existing dual-write. Map `model` → `agent`:
   - `claude-haiku-4-5-*` → `haiku`
   - `glm-4.7-flash` → `glm`
   - `gemini` | `cursor` | `codex` | `kiro` → same

2. **CC transcripts** — `cc-usage.ts` already scans `~/.claude/projects`. Either:
   - **Option A:** One-time or periodic import into a unified log (e.g. `usage.jsonl` or Supabase)
   - **Option B:** On-demand scan at query time (current cc-usage behavior)

3. **Cursor transcripts** — Same as CC: on-demand scan of `~/.cursor/projects/*/agent-transcripts/*.jsonl`. Count sessions, estimate turns; tokens = `-` unless format adds usage.

4. **Agent runner direct cursor** — Add `logCost()` in `runCursorResearch` and `runCursorVerification` after successful runs (same style as helpers.ts).

### 3. Query API

**CLI:**
```bash
golems usage                    # Table output (default period: month)
golems usage --period=today
golems usage --period=all
golems usage --json             # For piping / statusline
```

**MCP (golems-jobs or new golems-usage server):**
```
usage_table(period?: "today" | "week" | "month" | "all") → table rows
usage_summary(period?) → aggregated stats
```

### 4. Implementation Plan

| Phase | Task |
|-------|------|
| 1 | Add `logCost()` to agent-runner direct cursor flows |
| 2 | Add `usage_table()` to cost-tracker (or new `usage-tracker.ts`) that aggregates api_costs + CC scan |
| 3 | Add `golems usage` subcommand (reuse or extend `golems costs`) |
| 4 | Add MCP tool `usage_table` to jobs MCP (or consolidate into shared MCP) |
| 5 | (Optional) Add Ollama default path logging to ollama-helper.ts |
| 6 | (Optional) Support Cursor transcript scan if format gains usage data |

### 5. File Layout

```
packages/shared/src/lib/
├── cost-tracker.ts     # Existing; keep dual-write
├── usage-tracker.ts   # NEW: aggregates cost-tracker + CC scan, outputs table
```

```
scripts/
├── cc-usage.ts        # Keep; usage-tracker can reuse scanCCTranscripts()
```

### 6. Dependencies

- `usage-tracker.ts` imports: `cost-tracker`, `readdirSync`/`readFileSync` for CC scan
- Reuse `scanCCTranscripts` from cc-usage or factor into shared lib
- Period filtering: same as cost-tracker (`today`/`week`/`month`/`all`)

---

## Appendix: api_costs.jsonl Sample

```json
{"timestamp":"2026-02-09T18:21:10.115Z","model":"test-model","source":"test-e2e","input_tokens":100,"output_tokens":50,"cost_usd":0.001,"tier":"paid"}
{"timestamp":"2026-02-12T10:00:00.000Z","model":"gemini","source":"helpers","input_tokens":0,"output_tokens":0,"cost_usd":0,"tier":"free","duration_ms":5400}
```

## Appendix: CC Transcript Structure (cc-usage expects)

```json
{"type":"assistant","message":{"model":"claude-sonnet-4-5-20250929","usage":{"input_tokens":1200,"output_tokens":340,"cache_read_input_tokens":0,"cache_creation_input_tokens":0}},"timestamp":"2026-02-12T14:00:00.000Z"}
```

## Appendix: Cursor Transcript Structure (current)

```json
{"role":"user","message":{"content":[{"type":"text","text":"..."}]}}
{"role":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
```

No `usage` field; session/turn count only.
