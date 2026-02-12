# Phase 1 Findings: Ollama GLM Setup + Benchmark

## Decision

**GLM-4.7-Flash is production-ready for batch/background tasks.** Quality matches Haiku on all 7 test cases. Latency (39s avg) is acceptable for overnight/background work but not interactive use.

**Recommendation:** Use GLM for NightShift enrichment, batch email scoring, overnight job matching. Keep Haiku API for interactive/real-time tasks where latency matters.

---

## Benchmark Results (2026-02-12)

### Environment
- **Hardware:** M1 Pro, 32GB unified memory
- **GLM:** glm-4.7-flash via Ollama (19GB model, 18GB VRAM)
- **Haiku:** claude-haiku-4-5-20251001 via Anthropic API (1Password key)
- **Bun localhost fix:** Ollama binds IPv4 only; changed all URLs from `localhost` to `127.0.0.1`

### Results: Both 7/7 PASS

| Test | GLM | GLM ms | Haiku | Haiku ms | Notes |
|------|-----|--------|-------|----------|-------|
| Email: Interview invite (score=10) | PASS | 51,167 | PASS | 838 | Both scored 10, correct category |
| Email: Newsletter spam (score=2) | PASS | 33,858 | PASS | 960 | Both scored 2, correct category |
| Email: Subscription receipt (score=5-6) | PASS | 25,004 | PASS | 1,022 | Both extracted Netflix/$15.49/monthly |
| Job: React match (score=9-10) | PASS | 35,984 | PASS | 1,861 | GLM=10, Haiku=9 (both valid) |
| Job: Java wrong stack (score=1-3) | PASS | 47,027 | PASS | 2,009 | GLM=1, Haiku=2 (both valid) |
| PR comment summary | PASS | 34,914 | PASS | 1,374 | Both identified hardcoded pricing, HIGH severity |
| Chunk tagging (debugging) | PASS | 45,481 | PASS | 1,418 | Both: intent=debugging, good tags |

### Aggregate

| Metric | GLM-4.7-Flash | Haiku 4.5 |
|--------|--------------|-----------|
| Pass rate | 7/7 (100%) | 7/7 (100%) |
| Avg latency | 39,062ms | 1,355ms |
| Speed ratio | 1x | 29x faster |
| Cost per run | $0 | ~$0.002 |
| VRAM usage | 18GB | 0 (cloud) |
| Monthly cost (100 calls/day) | $0 | ~$6 |

### Quality Analysis

- **JSON compliance:** Both produce valid JSON every time. No malformed outputs.
- **Score accuracy:** Identical on 5/7 tests. GLM slightly more extreme (score=1 vs Haiku's 2 for wrong-stack Java; score=10 vs Haiku's 9 for React match). Both within acceptable range.
- **Reasoning quality:** Both provide clear, relevant explanations. Haiku's reasoning is slightly more detailed (mentions geography, reversed requirements). GLM is more concise.
- **Extraction accuracy:** Identical subscription extraction (Netflix, $15.49, monthly).
- **Tagging quality:** GLM produced 10 tags vs Haiku's 6, both correct intent. GLM more verbose in tagging.

---

## Research: Fine-Tuning Options

### Summary
Fine-tuning a 7B model (Qwen3-7B) on our task data is viable and could beat both GLM and Haiku on narrow tasks while being 3-5x faster than GLM.

### Key Findings
1. **MLX + QLoRA** is the gold standard for Apple Silicon fine-tuning
2. **Qwen3-7B** is the recommended base model (fast, good JSON, fits easily in 32GB)
3. **Zikaron's 226K chunks** can provide 3000-7000 high-quality training examples
4. Fine-tuned 7B can beat general 30B on narrow tasks (+20-30% accuracy)
5. Training time: 2-4 hours on M1 Pro
6. Inference speed: 3-5x faster than GLM-4.7-Flash (100-150 tok/sec vs 30 tok/sec)

### Path Forward
See `claude.scratchpad.md` "Fine-Tuning Research" section for full analysis including:
- MLX setup commands
- Data preparation from Zikaron
- Training hyperparameters
- Cost analysis
- Risk mitigations

---

## Technical Notes

### Bun + Ollama IPv4/IPv6 Issue
Bun's `fetch()` resolves `localhost` to `::1` (IPv6), but Ollama only listens on `127.0.0.1` (IPv4). Fix: use `127.0.0.1` in all Ollama URLs.

### API Key for Haiku
The shell's `ANTHROPIC_API_KEY` is the subscription auth key (starts with `sk-ant-`), which doesn't work for API calls. Benchmark now uses `op read` to get the real golems API key from 1Password (`ANTHROPIC_GOLEMS_API_KEY`).

### Benchmark Script
`scripts/benchmark-glm.ts` — 7 test cases covering email scoring, job matching, summarization, and chunk tagging. Runs both models sequentially. Output to stdout.

---

## Status Checklist

- [x] Pull GLM-4.7-Flash
- [x] Basic prompt testing
- [x] Benchmark: email scoring (3 tests)
- [x] Benchmark: job matching (2 tests)
- [x] Benchmark: summarization (1 test)
- [x] Benchmark: JSON extraction (all tests validate JSON)
- [x] Measure latency + RAM (39s avg, 18GB VRAM)
- [ ] Test concurrency (deferred — not needed for batch use case)
- [x] Write findings + decision
