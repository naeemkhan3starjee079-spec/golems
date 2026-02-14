# Phase 1: Hebrew Re-embedding (BGE-M3)

> [Back to main plan](../README.md)

## Goal

Re-embed Hebrew WhatsApp chunks (and ideally all 245K) with BGE-M3 so Hebrew text produces meaningful vectors instead of noise.

## Why First

bge-large-en-v1.5 has virtually zero Hebrew tokens — Hebrew characters decompose to `[UNK]`. The 16K WhatsApp chunks are effectively invisible to clustering. Everything downstream depends on real embeddings.

## Tools
- **Research:** verify BGE-M3 Hebrew quality with sample queries
- **Code:** Python script for re-embedding
- **Compute:** RunPod T4 ($0.20/hr) for speed, or local M1 Pro (~2-4 hours)

## Steps

1. Install BGE-M3: `pip install FlagEmbedding` or use sentence-transformers with `BAAI/bge-m3`
2. Benchmark locally: embed 100 Hebrew WhatsApp chunks, verify cosine similarity makes sense
3. Decision: re-embed ALL 245K (ideal, ~$2 on RunPod A100, 1-2 hours) or just 16K WhatsApp (~10 min on T4)
4. If mixing models: create separate `vec_chunks_m3` table, don't mix with existing vec0
5. If full re-embed: replace `vec_chunks` entirely, update daemon/MCP to use new table
6. Verify: search for Hebrew queries, confirm results are relevant

## Key Decision

**Full re-embed vs WhatsApp-only:**
- Full ($2, 1-2 hours): Clean single-model index, best clustering quality
- WhatsApp-only ($0.05, 10 min): Two vec0 tables, cluster independently, link via temporal/entity overlap
- Research recommends full re-embed — BGE-M3 matches bge-large on English while adding Hebrew

## Depends On
- Nothing — this is the first phase

## Status
- [ ] Install BGE-M3
- [ ] Benchmark Hebrew embedding quality
- [ ] Decide full vs WhatsApp-only
- [ ] Execute re-embedding
- [ ] Update vec0 table(s)
- [ ] Verify Hebrew search quality
