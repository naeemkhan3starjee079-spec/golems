# Phase 4: Railway Free Cloud API (Gemini/Groq)

> [Back to main plan](../README.md)

## Goal

Replace Haiku API on Railway cloud worker with a free LLM API, eliminating the last paid LLM cost (~$6/month).

## Pivot: Gemini/Groq Instead of Zhipu

Deep research (Feb 2026) revealed:
- **Zhipu/Z.AI** — free and capable BUT on US Entity List (Jan 2025). Legal ambiguity for US-based servers.
- **Gemini 2.5 Flash-Lite** — 1,000 RPD free, Google infrastructure, OpenAI SDK compatible
- **Groq** — 1,000 RPD free (Llama 4 Scout), fastest inference, no credit card needed

**Decision:** Primary = Gemini Flash-Lite, Fallback = Groq. Both zero cost, both Vercel AI SDK compatible.

## SDK: Vercel AI SDK

Use `ai` package (Vercel AI SDK) instead of raw OpenAI SDK. Benefits:
- Unified provider interface — swap Gemini/Groq/Ollama with one import
- `generateText`, `generateObject` for structured output
- Built-in streaming, retries, provider fallback
- Already in TS/Bun ecosystem
- `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/openai` providers

## Privacy Architecture (Hybrid)

- **Cloud (Gemini/Groq):** Sanitized data only — email subjects, job descriptions, summaries
- **Local (Ollama):** Full email bodies, personal data — nothing leaves Mac
- **Option:** Local Ollama enriches with full content → cloud scores sanitized summaries

## Tools

- **Research:** Claude Desktop deep research (done — see findings.md)
- **Code:** Vercel AI SDK integration, Railway env vars

## Steps

1. ~~Research free LLM APIs~~ (done — see findings.md)
2. Install Vercel AI SDK: `bun add ai @ai-sdk/google @ai-sdk/groq`
3. Create `packages/shared/src/lib/vercel-llm.ts`:
   - Uses `generateText` from `ai` package
   - Provider selection via `LLM_BACKEND` env var
   - `runCloudLLM(prompt, source)` — same interface as existing runHaiku
   - `runCloudLLMJSON<T>(prompt, source)` — uses `generateObject` for structured output
   - Fallback chain: Gemini → Groq → Haiku (auto-retry on 429)
   - Cost tracking: log as `tier: "free"` with actual token counts
4. Update `llm.ts` to support `LLM_BACKEND=gemini` and `LLM_BACKEND=groq`
5. Get API keys:
   - Gemini: `aistudio.google.com` → store as `GEMINI_API_KEY` in 1Password
   - Groq: `console.groq.com` → store as `GROQ_API_KEY` in 1Password
6. Set Railway env vars via `/railway variables` skill:
   - `LLM_BACKEND=gemini`
   - `GEMINI_API_KEY=op://development/GEMINI_API_KEY/credential`
   - `GROQ_API_KEY=op://development/GROQ_API_KEY/credential` (fallback)
7. Deploy to Railway, test email + job scoring
8. Monitor for rate limits / quality issues over 24h
9. If stable: remove `ANTHROPIC_API_KEY` from Railway

## Free Tier Comparison (from deep research)

| Provider | Model | RPD | RPM | OpenAI Compatible | Risk |
|----------|-------|-----|-----|-------------------|------|
| **Gemini** | 2.5 Flash-Lite | 1,000 | 15 | Yes | Google cut limits 50-92% in Dec 2025 |
| **Groq** | Llama 4 Scout | 1,000 | 30 | Yes | No SLA on free tier |
| Zhipu/Z.AI | GLM-4.7-Flash | unlimited | ~1 concurrent | Yes | US Entity List, China infra |
| Cerebras | Various | ? | ? | Yes | 8K context limit, deprecations |
| OpenRouter | Various free | 50 | ? | Yes | Only 50 RPD on free tier |

## Privacy Note

Railway cloud worker processes **non-personal data** only (email subjects, job descriptions).
Gemini/Groq API is acceptable here — same kind of data that was going to Anthropic's Haiku API.

## Depends On

- Phase 1 (benchmarks) — done
- Independent from Phase 2/3

## Status

- [x] Research free LLM APIs (deep research)
- [ ] Install Vercel AI SDK (`bun add ai @ai-sdk/google @ai-sdk/groq`)
- [ ] Create vercel-llm.ts (unified provider interface)
- [ ] Update LLM backend switch (gemini + groq)
- [ ] Add fallback chain (gemini → groq → haiku)
- [ ] Get API keys (Gemini + Groq)
- [ ] Store keys in 1Password
- [ ] Set Railway env vars
- [ ] Deploy + test
- [ ] Monitor 24h
- [ ] Remove ANTHROPIC_API_KEY from Railway
