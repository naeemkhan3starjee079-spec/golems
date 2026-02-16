# Phase 4: MLX Local Backend

> [Back to main plan](../README.md)

## Goal

Add MLX as an alternative local LLM backend alongside Ollama for all local inference (enrichment, MCP summarization, scripts). MLX is 21-87% faster on Apple Silicon and enables parallel inference with smaller models.

## Tools

- **Research:** Done — [gemini-research.md](../research/gemini-research.md) (MLX section), [audit-llm-backends.md](../research/audit-llm-backends.md)
- **Code:** Claude Opus (Python + TypeScript edits)
- **Install:** `pip install mlx-lm` + download model weights from HuggingFace

## Context

From research + audit:
- MLX achieves 21-87% higher throughput than llama.cpp (Ollama) on Apple Silicon
- MLX serves via `mlx-lm.server` with **OpenAI-compatible API** (`/v1/chat/completions`)
- Ollama uses its own API format (`/api/generate`) — different request/response shapes
- Enrichment pipeline calls Ollama directly (Python `requests.post`)
- TS backends (glm-llm.ts, ollama-helper.ts) also use Ollama format
- All call sites need an adapter or new backend path

Model choice for M1 Pro 32GB:
- **Qwen2.5-Coder-14B** (~10GB at Q4) — half the RAM of GLM-4.7-Flash 30B (19.5GB)
- Enables 3-4 parallel contexts
- Equal or better accuracy for code summarization/tagging

## Steps

### 1. Install MLX + download model
```bash
pip3 install mlx-lm
# Download Qwen2.5-Coder-14B-Instruct in MLX format
python3 -m mlx_lm.convert --hf-path Qwen/Qwen2.5-Coder-14B-Instruct -q
# Or use pre-converted: mlx-community/Qwen2.5-Coder-14B-Instruct-4bit
```

### 2. Test MLX server
```bash
python3 -m mlx_lm.server --model mlx-community/Qwen2.5-Coder-14B-Instruct-4bit --port 8080
# Test: curl http://localhost:8080/v1/chat/completions -d '{"model":"default","messages":[{"role":"user","content":"hello"}]}'
```

### 3. Add MLX backend to enrichment pipeline
In `packages/zikaron/src/zikaron/pipeline/enrichment.py`:

New env var: `ZIKARON_ENRICH_BACKEND=ollama|mlx` (default: `ollama`)

Add `call_mlx(prompt)` function:
- POST to `http://127.0.0.1:8080/v1/chat/completions` (OpenAI format)
- Request: `{"model": "default", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}}`
- Response: `choices[0].message.content`
- Token counts: `usage.prompt_tokens`, `usage.completion_tokens`

Keep existing `call_glm()` unchanged. Switch between them based on `ZIKARON_ENRICH_BACKEND`.

### 4. Add MLX backend to TypeScript LLM stack
In `packages/shared/src/lib/`:

New file: `mlx-llm.ts`
- Same interface as `glm-llm.ts`: `runMLX(prompt, source)`, `runMLXJSON(prompt, source)`
- POST to `http://127.0.0.1:8080/v1/chat/completions`
- Uses OpenAI request format (cleaner than Ollama format)

Update `llm.ts` router:
- Add `LLM_BACKEND=mlx` option → routes to `mlx-llm.ts`

### 5. Update GLM MCP server
In `packages/shared/src/glm/mcp-server.ts`:

Add env var: `GLM_BACKEND=ollama|mlx` (default: `ollama`)
- `ollama` → existing `runGLM`/`runGLMJSON`
- `mlx` → new `runMLX`/`runMLXJSON`

### 6. Update shell scripts
Scripts that call Ollama directly:
- `scripts/summarize-file.sh` — add MLX endpoint option
- `scripts/enrich.sh` — pass `ZIKARON_ENRICH_BACKEND` to enrichment
- `scripts/enrichment-window.sh` — same

### 7. Add MLX health check
In `daemon.py` health endpoint:
- Check `http://127.0.0.1:8080/v1/models` (MLX) alongside existing Ollama check
- Report which backend(s) are available

### 8. Create launchd plist for MLX server (optional)
`launchd/com.golems.mlx-server.plist`:
- Runs `python3 -m mlx_lm.server --model <model> --port 8080`
- KeepAlive, auto-restart
- Only if user wants MLX always-on

### 9. Benchmark MLX vs Ollama
Run 50 chunks through each:
- GLM-4.7-Flash via Ollama (current)
- Qwen2.5-Coder-14B via MLX
- Compare: tokens/sec, quality of output, memory usage
- Log results to `phase-4/findings.md`

### 10. Update Doctor + Wizard
- `golems doctor` checks MLX server availability
- `golems wizard` offers MLX setup option

## Depends On

- None (independent of phases 1-3, can be done in parallel)
- But best tested after Phase 3 backfill completes (so ongoing enrichment uses MLX)

## Status

- [ ] Install MLX + download Qwen2.5-Coder-14B model
- [ ] Test MLX server manually
- [ ] Add MLX backend to enrichment.py (ZIKARON_ENRICH_BACKEND)
- [ ] Add mlx-llm.ts to TypeScript LLM stack
- [ ] Update GLM MCP server to support MLX backend
- [ ] Update shell scripts (summarize-file.sh, enrich.sh, enrichment-window.sh)
- [ ] Add MLX health check to daemon
- [ ] Create launchd plist (optional)
- [ ] Benchmark MLX vs Ollama (50 chunks each)
- [ ] Update Doctor + Wizard
