# Phase 2 Findings: GLM MCP Server

> [Back to Phase 2 README](./README.md)

## Research Summary

### 1. MCP Servers That Wrap LLM APIs

**General pattern:** MCP wrapping acts as a translator between LLM applications and existing APIs. Servers use JSON-RPC 2.0 over stdio/HTTP/SSE. For LLM-backed tools, the server receives a tool call, builds a prompt, calls the LLM API, and returns the result as tool output.

**Existing Ollama MCP implementations:**

| Project | Language | Notable Features |
|---------|----------|------------------|
| [NightTrek/Ollama-mcp](https://github.com/NightTrek/Ollama-mcp) | JavaScript | Full API coverage, model management (pull/list/create), `chat_completion` tool, `run` tool. Uses `OLLAMA_HOST` env (default `http://127.0.0.1:11434`). |
| [etnlbck/ollama-mcp](https://glama.ai/mcp/servers/@etnlbck/ollama-mcp) | TypeScript | Multi-turn conversations, model management, stdio + HTTP transport. |
| [hyzhak/ollama-mcp-server](https://mcp.aibase.com/server/1475585804276604929) | — | Chain-of-thought reasoning, multimodal support. |

**Key takeaway:** None of these are "task-specific" (summarize/score/classify/extract). They expose generic `run` / `chat_completion` style tools. Our GLM MCP should expose **domain tools** that match golems use cases.

---

### 2. Existing ollama-mcp-server npm Package

**No single canonical npm package.** Options:

- **NightTrek/Ollama-mcp** — requires `pnpm install` + `pnpm run build`, then `node build/index.js`. Not published to npm.
- **etnlbck/ollama-mcp** — appears on Glama registry; install via MCP package manager.
- **mcp-client-for-ollama** (PyPI) — Python **client** for Ollama, not an MCP server.

**Recommendation:** Build our own thin server in `packages/shared` or `packages/services`. Reuse golems patterns; avoid pulling in a heavy external server.

---

### 3. Golems MCP Server Pattern

**Reference:** `packages/shared/src/email/mcp-server.ts` and `packages/jobs/src/mcp-server.ts`

**Structure:**

```
1. Load env first: import "../lib/load-env" or import "@golems/shared/lib/load-env"
2. Server setup:
   - Server({ name, version }, { capabilities: { tools: {} } })
   - StdioServerTransport for stdio (default for Claude Code)
3. ListToolsRequestSchema handler:
   - Returns tools[] with name, description, inputSchema
   - inputSchema: type "object", properties, required
4. CallToolRequestSchema handler:
   - switch (name) on tool name
   - Call async handler, return { content: [{ type: "text", text }] }
   - Catch errors, return isError: true
5. StdioServerTransport.connect(server) + server.connect()
6. Entry: if (import.meta.main) { ... }
```

**Email MCP tools pattern:** Each tool has a `handleX(args)` async function. Handlers return `{ content: [{ type: "text" as const, text: string }] }`.

**Jobs MCP:** Same pattern. `jobs_generateCoverLetter` uses `runHaiku` from cloud-llm (lines 650–671) — direct LLM call inside a tool handler.

**Config (.mcp.json):**

```json
{
  "golems-glm": {
    "command": "bun",
    "args": ["run", "packages/shared/src/glm/mcp-server.ts"],
    "env": { "OLLAMA_MODEL": "glm-4.7-flash" }
  }
}
```

---

### 4. Required Tools

| Tool | Params | Behavior |
|------|--------|----------|
| `glm_summarize` | `text`, `maxLength?` (default ~500 chars) | Summarize long text to key points. Prompt: "Summarize concisely in max N chars..." |
| `glm_score` | `prompt`, `schema` (JSON schema or fields) | Run prompt, parse JSON output matching schema. Use Ollama `format: "json"` or schema object. |
| `glm_classify` | `text`, `categories` (string[]) | Classify into one of categories. Output: `{ category, confidence }`. |
| `glm_extract` | `text`, `fields` (string[] or schema) | Extract structured data. Output: JSON object with requested fields. |

**Implementation note:** All tools call `POST http://127.0.0.1:11434/api/generate` with `stream: false`.

---

### 5. Ollama URL: 127.0.0.1 (NOT localhost)

**Bun IPv6 bug:** `localhost` can resolve to `::1` (IPv6) and cause connection failures. `ollama-helper.ts` already uses `http://127.0.0.1:11434` for embeddings (line 61).

**Recommended:** Use `OLLAMA_URL` env with default `http://127.0.0.1:11434`. Same pattern as `ollama-sandboxed.ts` (line 13).

---

### 6. Model Configuration

**Default:** `glm-4.7-flash` (Ollama model name; 30B-A3B MoE).

**Config:** `OLLAMA_MODEL` env var. Same as `ollama-helper.ts` pattern (`OLLAMA_MODEL || "qwen2.5-coder:7b"`).

---

### 7. Reusable Code from ollama-helper.ts

| Function | Reusable? | Notes |
|----------|-----------|-------|
| `runOllama(prompt)` | No | Uses CLI `ollama run` spawn; we need HTTP for configurable model. |
| `runOllamaJSON<T>(prompt)` | Partially | JSON extraction logic (regex `\{[\s\S]*\}`) is reusable. |
| `getEmbedding` | No | MCP tools don't need embeddings. |
| URL constant | Yes | `http://127.0.0.1:11434` — copy or import from shared config. |

**New HTTP helper needed:** `callOllamaGenerate(prompt, options?: { model?, format?, system? })` → `Promise<string>`. Use `fetch` to `POST /api/generate` with `stream: false`.

**Ollama generate request (from docs):**

```json
{
  "model": "glm-4.7-flash",
  "prompt": "...",
  "stream": false,
  "format": "json"  // or omit for free-form
}
```

**Response:** `{ response: string, done: boolean, ... }` — use `response` field.

---

## Decisions

1. **Location:** `packages/shared/src/glm/mcp-server.ts` or `packages/services/src/glm-mcp-server.ts` — align with where other LLM-facing code lives. `packages/shared` if used by multiple packages; `packages/services` if only for local tooling.
2. **HTTP vs CLI:** Use Ollama HTTP API exclusively for generation (configurable model, no shell).
3. **Tools:** Implement the four tools above; defer `glm_rerank` and `glm_synthesize` from Phase 2 README if scope grows.

---

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Create `callOllamaGenerate` HTTP helper | Cursor | Done |
| Create MCP server file following email/jobs pattern | Cursor | Done |
| Implement glm_summarize | Cursor | Done |
| Implement glm_score | Cursor | Done |
| Implement glm_classify | — | Deferred (Phase 6) |
| Implement glm_extract | — | Deferred (Phase 6) |
| Error handling (Ollama down → clear message) | Cursor | Done |
| Add to .mcp.json | Cursor | Done |
| **Fix Bun panic (FilePoll.register failed: 22)** | — | **Blocking** |
| Test with real content | — | Pending |

## Cursor Implementation Notes (2026-02-12)

Cursor created `packages/shared/src/glm/mcp-server.ts` (220 lines) with:
- `glm_summarize(text, maxSentences?)` — summarize text
- `glm_score(text, prompt, schema)` — score/classify with JSON output
- Registered in `.mcp.json` as `golems-glm`

**Bun panic issue:** `FilePoll.register failed: 22` when running with `bun`. This is a Bun + MCP SDK (StdioServerTransport) compatibility issue. Options:
1. Run with `node` instead of `bun` (most likely fix)
2. Check MCP SDK version compatibility
3. Use HTTP transport instead of stdio

---

## Notes

- NightTrek config uses `OLLAMA_HOST`; our codebase uses `OLLAMA_URL`. Prefer `OLLAMA_URL` for consistency with `ollama-sandboxed.ts`.
- Phase 2 README mentions `glm_tag` and `glm_rerank`; this research focuses on the four tools explicitly requested. `glm_tag` could map to `glm_classify` with open categories.
- `scripts/benchmark-glm.ts` already calls Ollama HTTP API — can reuse request/response handling pattern.
