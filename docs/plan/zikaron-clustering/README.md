# Zikaron Hierarchical Clustering

> Replace flat semantic search with a 3-level cluster hierarchy for browsing, query-relevant results, and content automation intelligence.

**Status:** Planning complete — ready for execution

---

## Progress

| Phase | Name | Status | Branch | PR |
|-------|------|--------|--------|----|
| 1 | Hebrew Re-embedding (BGE-M3) | [ ] Pending | - | - |
| 2 | Initial Clustering (Recursive Leiden) | [ ] Pending | - | - |
| 3 | Labeling (c-TF-IDF + GLM-4.7) | [ ] Pending | - | - |
| 4 | Search Integration | [ ] Pending | - | - |
| 5 | Incremental Updates | [ ] Pending | - | - |
| 6 | MCP Tools | [ ] Pending | - | - |
| 7 | Visualization (Treemap + 3D Hulls) | [ ] Pending | - | - |
| 8 | Content Automation Hooks | [ ] Pending | - | - |

---

## Architecture

```text
245K chunk embeddings (sqlite-vec, 1024 dims)
  → L2-normalize
    → Faiss IndexFlatIP k=30 KNN graph (5-15 min, ~2 GB)
      → igraph conversion
        → Recursive Leiden at 3 resolutions
          Level 0: ~40 clusters (resolution ~0.005)
          Level 1: ~400 clusters (~10 per L0, resolution ~0.05)
          Level 2: ~4000 clusters (~10 per L1, resolution ~0.5)
            → Centroids + materialized paths → SQLite
              → c-TF-IDF labels (all) + LLM labels (L0+L1)
```

**Peak memory:** ~3.6 GB (steps 1-5), then 19 GB for Ollama labeling (sequential, not concurrent)
**Total time:** ~45-80 minutes local on M1 Pro 32GB

---

## Key Decisions (from deep research)

| Decision | Choice | Why |
|----------|--------|-----|
| **Algorithm** | Recursive Leiden on Faiss KNN graph | 3-4 GB RAM, 15-30 min, direct resolution control, familiar from brain_graph.py |
| **NOT HDBSCAN** | Too much RAM (480 GB pairwise, or 8-15 GB with UMAP) | Condensed tree gives indirect hierarchy control |
| **NOT Faiss K-Means** | Assumes spherical clusters | Uneven sizes, poor semantic fit |
| **Hebrew embeddings** | Re-embed with BGE-M3 (1024 dims, multilingual) | bge-large-en-v1.5 produces near-random vectors for Hebrew |
| **Storage** | Materialized path + adjacency list hybrid | Fast subtree queries (LIKE) + direct parent lookup |
| **Centroids** | Separate vec_cluster_centroids table with level partition key | Level-filtered KNN search for nearest cluster |
| **Search** | Search-first + cluster annotation + sibling expansion | Preserves existing BM25+semantic quality, adds context |
| **Labeling** | Tiered: c-TF-IDF (all 5K) + GLM-4.7 (top 550) | c-TF-IDF is 2-5 min; LLM only for browsable levels |
| **Incremental** | Top-down nearest-centroid + weekly health checks | 5,550 distance computations per chunk (milliseconds) |
| **Re-cluster** | Full rebuild every 4-6 weeks based on silhouette drift | ~750 chunks/day = 3% weekly growth |
| **Viz** | Plotly treemap + sunburst + Three.js hull overlays | Treemap for browsing, 3D for spatial exploration |

---

## Dependencies

- **Enrichment pipeline** should complete (or reach critical mass) before clustering
- **Content automation plan** (PR #155) — Phase 8 connects to that plan's Phase 6
- **Faiss** — needs `pip install faiss-cpu` (not currently installed)
- **BGE-M3** — needs `pip install FlagEmbedding` or use sentence-transformers

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hebrew bge-large embeddings are noise | 16K WhatsApp chunks cluster randomly | Phase 1: re-embed with BGE-M3 |
| Short WhatsApp messages = noisy embeddings | Loose clusters with wide variance | Accept catch-all clusters, min_cluster_size thresholds |
| Leiden resolution tuning is empirical | Cluster counts may not match targets | Binary-search function automates tuning |
| Centroid drift over weeks | Boundaries shift from true distribution | Weekly silhouette sampling, monthly true centroid recompute |
| 228K code chunks dominate space | WhatsApp squeezed into 1-2 clusters | Source-weighted sampling or accept + surface via metadata |
| sqlite-vec compound filters | May not work for level + parent_id | Fall back to top-K per level + Python filter |

---

## Research Sources

- `packages/zikaron/docs/hierarchical-clustering-research.txt` — NotebookLM analysis (algorithms, markdown priors, multilingual, infrastructure)
- `packages/zikaron/docs/hierarchical-clustering-deep-research.md` — Claude deep research (full implementation blueprint)
- `packages/zikaron/src/zikaron/brain_graph.py` — Existing Leiden session-level clustering
