# Phase 3: Labeling (c-TF-IDF + GLM-4.7-Flash)

> [Back to main plan](../README.md)

## Goal

Auto-label all ~5000 clusters with human-readable names using a tiered approach.

## Tools
- **Code:** BERTopic c-TF-IDF vectorizer, Ollama GLM-4.7-Flash
- **Compute:** Local (c-TF-IDF: 2-5 min, LLM: 15-30 min with OLLAMA_NUM_PARALLEL=2)

## Steps

1. **Tier 1: c-TF-IDF for all 5000 clusters** (2-5 minutes, no LLM)
   - Treat each cluster's chunks as single document
   - BERTopic: `bm25_weighting=True`, `reduce_frequent_words=True`
   - Extract top-5 keywords per cluster → `ctfidf_label` column
2. **Tier 2: LLM for Level 0 + Level 1** (~300-550 clusters)
   - For each: pass c-TF-IDF keywords + 5 representative chunks + enrichment tags
   - Prompt: "Given keywords {X}, tags {Y}, samples {Z} — provide 2-5 word label"
   - Set `OLLAMA_NUM_PARALLEL=2` to halve time (~15-30 min → ~10-18 min)
3. **Hierarchical label paths:** "Deployment / Railway / Dockerfile Config"
   - L0 label = broad domain
   - L1 label = sub-area
   - L2 label = c-TF-IDF keywords formatted as short phrase
4. Write labels to `clusters.label` and `clusters.ctfidf_label`
5. Manual review: spot-check 20 random clusters across all levels

## Depends On
- Phase 2 (clusters must exist)

## Status
- [ ] Implement c-TF-IDF labeling
- [ ] Implement LLM labeling with enrichment tags
- [ ] Generate hierarchical path labels
- [ ] Spot-check quality
