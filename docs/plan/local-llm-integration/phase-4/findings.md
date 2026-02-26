# Phase 4 Findings: Free Cloud LLM APIs

> [Back to Phase 4 README](./README.md)
> Source: Claude Desktop deep research (Feb 2026)

## Key Decision

**Pivot from Zhipu to Gemini/Groq.** Zhipu (Z.AI) is on the US Entity List since Jan 2025 — legal ambiguity for US-based Railway servers. Gemini Flash-Lite and Groq are both free, reliable, and zero compliance risk.

## Recommended Architecture

- **Primary:** Gemini 2.5 Flash-Lite (1,000 RPD, Google infra)
- **Fallback:** Groq Llama 4 Scout (1,000 RPD, fastest inference)
- **Emergency:** Keep Haiku as last resort (paid, reliable)

All three are OpenAI SDK compatible — change `base_url`, `api_key`, `model`.

## Provider Details

### Gemini 2.5 Flash-Lite
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/openai/`
- **Model:** `gemini-2.5-flash-lite`
- **Free tier:** 1,000 RPD, 15 RPM, 250K tokens/min
- **API key:** from `aistudio.google.com`
- **Risk:** Google cut free limits 50-92% in Dec 2025
- **EU blocked** from free tier (US fine)

### Groq
- **Endpoint:** `https://api.groq.com/openai/v1`
- **Models:** Llama 4 Scout (1,000 RPD), Qwen3 32B (1,000 RPD), Llama 3.1 8B (14,400 RPD)
- **Free tier:** No credit card, permanent, 30 RPM
- **Best for us:** Llama 4 Scout or Qwen3 32B
- **Speed:** 400-840 tok/s (fastest available)

### Zhipu/Z.AI (NOT recommended for Railway)
- **Endpoint:** `https://api.z.ai/api/paas/v4/`
- **Model:** `glm-4.7-flash`
- **Free tier:** Unlimited RPD, 1 concurrent (5-10 in practice)
- **Key format:** `{key_id}.{secret}` as Bearer token
- **Problem:** US Entity List since Jan 2025. Legal ambiguity.
- **Workaround:** Access via OpenRouter/Fireworks (host model independently)

### Not Truly Free
- **Together.ai** — $5 minimum credit purchase, no free trial
- **Fireworks.ai** — $1 free credits then payment required
- **OpenRouter** — 50 RPD free only ($10 one-time unlocks 1,000 RPD)

### Other Options
- **Cerebras** — Potentially fastest (1,800 tok/s), but 8K context limit, models being deprecated
- **Cloudflare Workers AI** — 10,000 free neurons/day (~100-300 LLM requests)

## Implementation Notes

- OpenAI SDK works with all three primary providers
- 2-second delay between calls avoids Groq's 30 RPM cap
- Monitor 429 errors — auto-fallback to next provider
- Our workload (~150 requests/day) fits comfortably in all free tiers

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Create gemini-llm.ts | — | Pending |
| Create groq-llm.ts | — | Pending |
| Get API keys | — | Pending |
| Update llm.ts + Railway | — | Pending |
