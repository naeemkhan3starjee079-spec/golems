# Phase 1: Aggregation Pipeline

> [Back to main plan](../README.md)

## Goal

Build a Python pipeline that transforms 240K Zikaron chunks into a visualization-ready `graph.json` with 500-2,000 meaningful nodes, pre-computed 3D coordinates, and hierarchical community structure.

## Tools

- **Research:** Gemini — best practices for graspologic + UMAP on real data
- **Code:** Opus — pipeline script in `packages/zikaron/src/zikaron/pipeline/`
- **MCPs:** zikaron (stats, search), supabase (session data)

## Key Decisions (from research)

- **Leiden over Louvain** — guarantees connected communities, faster, better partitions
- **Hybrid similarity** — 40% cosine (embeddings) + 35% Jaccard (files) + 15% temporal + 10% branch/PR
- **Three hierarchy levels** — coarse (~100 nodes), medium (~500-2K), fine (~2K-5K)
- **Pre-compute layout** — UMAP to 3D for initial positions, force simulation optional on client
- **c-TF-IDF for labels** — fast cluster labeling from session summaries

## Steps

1. Install Python deps: `graspologic`, `umap-learn`, `hdbscan`, `igraph`, `leidenalg`, `networkx`
2. Add `pipeline/brain_graph.py` — main pipeline script
3. Query VectorStore for all sessions + session embeddings (mean-pool chunk embeddings per session)
4. Build session-session similarity matrix (hybrid: semantic + file overlap + temporal + branch)
5. Run hierarchical Leiden community detection (graspologic) at 3 resolution levels
6. Compute UMAP 3D coordinates per session for layout
7. Generate super-nodes: one per community with c-TF-IDF label, size by composite score
8. Generate edges: inter-community connections weighted by cross-community links
9. Compute node metadata: dominant operation type (color), importance (size), recency (glow)
10. Export `graph.json` with `{ nodes: [...], edges: [...], hierarchy: {...} }`
11. Add CLI command: `zikaron brain-export [--output path] [--project name]`
12. Test with real Zikaron data — verify node count in 500-2K range

## Output

```
~/.golems-brain/graph.json     # Pre-generated graph for frontend
~/.golems-brain/metadata.json  # Stats: node count, edge count, last generated, coverage
```

## Depends On

Nothing — first phase.

## Status

- [x] Install Python deps (pyproject.toml `[brain]` extras: igraph, leidenalg, umap-learn, hdbscan)
- [x] Build similarity matrix (cosine on mean-pooled session embeddings, threshold 0.40)
- [x] Hierarchical Leiden community detection (3 resolutions: coarse/medium/fine)
- [x] UMAP 3D layout computation (3D coordinates per session)
- [x] Community labels with c-TF-IDF
- [x] Edge computation (top-5-per-node + threshold filter)
- [x] graph.json export (2509 nodes, ~6K edges from 240K chunks)
- [x] CLI command `zikaron brain-export [--output path] [--project name]`
- [x] Test with real data — 2509 nodes, 16 communities, modularity 0.80

### Notes
- Session data built from `source_file` groupings (not session_context, which only has 5 rows)
- KNN graph (k=15) instead of threshold — threshold approach failed (cliff at 0.35-0.40)
- Hybrid similarity coded (cosine 40% + file 35% + temporal 15% + branch 10%) but mostly cosine for now
- Pipeline takes ~8 min for 2509 sessions on M1 Pro
- Community labels are keyword-ish (c-TF-IDF) — will improve with LLM labeling later
