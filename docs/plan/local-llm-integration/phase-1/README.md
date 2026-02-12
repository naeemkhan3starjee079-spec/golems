# Phase 1: Ollama GLM Setup + Benchmark

> [Back to main plan](../README.md)

## Goal

Pull GLM-4.7-Flash into Ollama, verify it works, benchmark it against Haiku on our actual workloads.

## Tools

- **Research:** gemini — "best Ollama quantization for M1 Pro 32GB GLM-4.7-Flash"
- **Code:** direct CLI (ollama commands, simple test scripts)

## Steps

1. Pull GLM-4.7-Flash model via Ollama
2. Test basic prompts: text classification, JSON extraction, summarization
3. Benchmark against Haiku on real golems tasks:
   - Email scoring (same prompts from `email/scorer.ts`)
   - Job matching (same prompts from `jobs/`)
   - Text summarization (PR comment style content)
   - JSON extraction (structured output reliability)
4. Measure: latency, quality score (1-10 vs Haiku), RAM usage, token throughput
5. Test concurrent requests (Ollama handles multiple calls?)
6. Document findings in `findings.md` with comparison table
7. Decision: is GLM-4.7-Flash good enough to replace Haiku for each task type?

## Depends On

- None (first phase)

## Status

- [ ] Pull GLM-4.7-Flash
- [ ] Basic prompt testing
- [ ] Benchmark: email scoring
- [ ] Benchmark: job matching
- [ ] Benchmark: summarization
- [ ] Benchmark: JSON extraction
- [ ] Measure latency + RAM
- [ ] Test concurrency
- [ ] Write findings + decision
