# Phase 4: Search Integration

> [Back to main plan](../README.md)

## Goal

Integrate cluster hierarchy into existing BM25 + semantic search pipeline. Add cluster annotation, sibling expansion, and cluster-derived relevance scoring.

## Tools
- **Code:** Modify daemon.py search flow, add SQL queries
- **Test:** Verify search quality with sample queries

## Steps

1. **Cluster annotation** — For each search result, JOIN chunk_clusters + clusters to get path
   - Attach as metadata: `"deployment / railway / dockerfile-optimization"`
2. **Sibling expansion** — For top-3 results, retrieve 5 highest-cohesion siblings from same leaf cluster
   - Chunks closest to centroid, excluding already-returned results
3. **Cluster-boosted reranking** — Multiple results sharing a leaf cluster get collective boost
4. **Replace static importance** with dynamic cluster relevance score:
   ```text
   0.3 × log(cluster_size) + 0.3 × cohesion + 0.2 × (1 - dist_to_centroid) + 0.2 × freshness
   ```
5. **Browse mode** — Add `?mode=browse` for cluster-first search (find nearest cluster → search within)
6. Update MCP `zikaron_search` to return cluster paths in results
7. Benchmark: compare search quality before/after on 20 test queries

## Future: RAPTOR Enhancement
Generate LLM summaries for each cluster as searchable nodes. Queries match leaf chunks for factual retrieval OR cluster summaries for thematic retrieval. RAPTOR paper showed 20% accuracy improvement.

## Depends On
- Phase 2 (clusters), Phase 3 (labels for annotation)

## Status
- [ ] Add cluster annotation to search results
- [ ] Implement sibling expansion
- [ ] Add cluster-boosted reranking
- [ ] Replace static importance score
- [ ] Add browse mode
- [ ] Update MCP tool
- [ ] Benchmark search quality
