# Zikaron Enrichment Backfill Plan

> Cloud backfill of 251K chunks via Gemini Batch API + local optimization for ongoing enrichment

**Status:** Research complete, implementation pending
**Research by:** Gemini Deep Research (2026-02-16)
**Budget:** ~$16-20 (Gemini 2.5 Flash-Lite Batch API)
**Timeline:** ~24hr batch processing, then local handles ongoing

---

## TL;DR

| Phase | What | Cost | Time |
|-------|------|------|------|
| 1. Cloud backfill | Gemini 2.5 Flash-Lite Batch API, 251K chunks | ~$16 | ~24hr (async) |
| 2. Local optimization | Switch Ollama/GLM-30B to MLX/Qwen2.5-Coder-14B | $0 | Setup time |
| 3. WhatsApp reindex | Fix missing user messages + NULL content_types | $0 | 1hr |

---

## Phase 1: Cloud Backfill

### Why Gemini 2.5 Flash-Lite + Batch API
- **50% batch discount** on async jobs (24hr completion window)
- $0.05/M input, $0.20/M output (batch pricing)
- Gemini 2.0 Flash is being **deprecated March 31, 2026** — don't use it
- Native JSON Schema mode guarantees valid structured output
- 1:1 chunk-to-request ratio (no packing — better accuracy)

### Cost Breakdown
- 251K chunks x ~500 input tokens = 125.5M input tokens
- 251K chunks x ~200 output tokens = 50.2M output tokens
- Input: 125.5 x $0.05 = $6.28
- Output: 50.2 x $0.20 = $10.04
- **Total: ~$16.32**

### Implementation
- Split 251K chunks into **18-20 batch jobs** (~14K chunks each, 10M token limit per job)
- Format as JSONL with `response_mime_type: "application/json"` + strict schema
- Submit via `ai.batches.create()` in Bun/TypeScript
- Poll for completion, download results, bulk update SQLite
- Checkpoint table for resume-from-failure

### Rate Limits
- Batch API bypasses daily RPD caps
- Tier 1: 10M enqueued tokens per batch job
- Real-time API would be 1,500 RPD cap = 167 days (useless)

---

## Phase 2: Local Optimization (Post-Backfill)

### Current vs Proposed

| | Current | Proposed |
|---|---|---|
| Framework | Ollama (llama.cpp + Metal) | MLX (Apple-native) |
| Model | GLM-4.7-Flash 30B (19.5GB) | Qwen2.5-Coder-14B (~10GB) |
| Parallelism | Sequential (1 request) | 3-4 parallel (OLLAMA_NUM_PARALLEL or mlx-lm) |
| Throughput | ~220/hr | ~1,500/hr (estimated) |
| RAM freed | 0 | ~9.5GB |

### Why Qwen2.5-Coder-14B
- 10GB at Q4 vs 19.5GB for GLM — fits 3-4 parallel contexts in 32GB
- Benchmarks show equal or better accuracy for code summarization/tagging
- MLX gives 21-87% throughput improvement over llama.cpp on Apple Silicon
- At 1,500/hr, handles 2,500 new chunks/day in under 2 hours

### Optional: Speculative Decoding
- Draft model: Qwen2.5-Coder-1.5B (predicts tokens)
- Target model: Qwen2.5-Coder-14B (verifies)
- 1.5-2x speedup for structured/predictable output like JSON tags

---

## Phase 3: WhatsApp Reindex

Current state:
- 16,347 chunks, ALL `sender='other'` (user's own messages missing)
- ALL `content_type=NULL` (skipped by enrichment)
- Single-character junk not filtered

Fix:
- Reindex with both sides (`is_from_me` flag exists in extractor)
- Set `content_type='user_message'` (self) / `'chat_message'` (other)
- Apply `min_char_count` filter
- Include in backfill batch

---

## Ongoing Cost (if cloud)

| Daily chunks | Monthly cost (Gemini 2.5 Flash-Lite batch) |
|-------------|---------------------------------------------|
| 1,000 | $1.95 |
| 2,500 | $4.87 |

---

## Prerequisites
- [ ] Google Cloud paid tier API key (or upgrade existing)
- [ ] Verify Gemini Batch API access on current project
- [ ] Stop local enrichment before backfill
- [ ] Export unenriched chunk IDs + content to JSONL

## Open Questions
- Run backfill from Railway cloud worker or local script?
- Keep local enrichment (MLX) or just pay ~$2-5/month cloud?
- Quality validation: run 100-chunk sample through Gemini first, compare to GLM output?
