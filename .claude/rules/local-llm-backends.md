# Local LLM Backends

> 7 backends available. Use free options first, paid only when quality demands it.

## Backend Priority (cheapest first)

| Backend | Cost | Model | Use Case |
|---------|------|-------|----------|
| `gemini` | Free | Gemini 2.5 Flash-Lite | Cloud worker scoring, web research |
| `glm` | Free (local) | GLM-4.7-Flash via Ollama | Summarization, enrichment, scoring |
| `mlx` | Free (local) | MLX models on Apple Silicon | Fast local inference (Phase 2) |
| `kiro` | Free | AWS-backed | Research, code gen |
| `codex` | ChatGPT Plus | OpenAI Codex | Code generation |
| `cursor` | $20/mo | GPT-5.2 Codex | Code editing, CSS work |
| `haiku` | $0.80/$4/MTok | Claude Haiku 4.5 | Quality scoring, complex tasks |

## Environment Variables

| Var | Values | Where |
|-----|--------|-------|
| `LLM_BACKEND` | `glm` · `mlx` · `ollama` (local) or `gemini` · `groq` (cloud) or `haiku` | Cloud worker, local services |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key | Gemini backend |
| `ANTHROPIC_API_KEY` | API key | Haiku backend (strip when spawning Claude CLI!) |

## Cost Tracking

All LLM calls are logged to `~/.golems-zikaron/api_costs.jsonl`:

```json
{"timestamp":"...","model":"haiku-4.5","source":"email-scorer","input_tokens":150,"output_tokens":50,"cost_usd":0.00032}
```

Also tracked in Supabase `golem_usage` table for dashboard visibility.

**Railway usage endpoint:** `GET /usage` on cloud worker.

## Source Tagging

Every LLM call MUST include a `source` tag for cost attribution:

| Source | What |
|--------|------|
| `email-scorer` | Email triage scoring |
| `job-scorer` | Job match scoring |
| `briefing` | Morning briefing generation |
| `enrichment` | BrainLayer chunk enrichment |
| `telegram` | ClaudeGolem chat responses |
| `outreach` | Recruiter outreach drafting |

## GLM MCP Tools

| Tool | What |
|------|------|
| `glm_summarize(text, maxSentences?)` | Condense to key points |
| `glm_score(text, prompt, schema)` | Structured JSON classification |

## Key Rules

1. **Strip `ANTHROPIC_API_KEY` from env** when spawning `claude --print` for subscription auth
2. **`"think": false`** in Ollama API calls for GLM — otherwise adds 350+ reasoning tokens (20s → 1s)
3. **Use `gemini` on Railway** — it's free. Haiku is fallback only
4. **Cost-check before Haiku:** If the task can be done by GLM/Gemini, use those instead
