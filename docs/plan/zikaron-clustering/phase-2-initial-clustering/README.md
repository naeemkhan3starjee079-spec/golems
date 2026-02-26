# Phase 2: Initial Clustering (Recursive Leiden)

> [Back to main plan](../README.md)

## Goal

Run the full hierarchical clustering pipeline on 245K chunks, producing a 3-level cluster tree stored in SQLite.

## Tools
- **Code:** Python (faiss-cpu, igraph, leidenalg, numpy, apsw)
- **Compute:** Local M1 Pro (kill Ollama first)

## Steps

1. Install faiss-cpu: `pip install faiss-cpu`
2. Create `src/zikaron/clustering.py` with core functions:
   - `extract_embeddings(db_path, batch_size=10000)` — batch-read from sqlite-vec
   - `build_knn_graph(embeddings, k=30)` — Faiss IndexFlatIP after L2 normalization
   - `knn_to_igraph(indices, distances, n)` — weighted undirected graph
   - `find_resolution_for_target(graph, target, lo, hi)` — binary search for resolution
   - `recursive_leiden(graph, node_indices, level_targets)` — guaranteed nested hierarchy
   - `compute_centroids(hierarchy, embeddings)` — mean embedding per cluster
3. Create SQLite schema (migration):
   - `clusters` table (id, level, parent_id, path, label, ctfidf_label, chunk_count, metrics)
   - `chunk_clusters` mapping table (chunk_id, cluster_id, level, dist_to_centroid)
   - `vec_cluster_centroids` virtual table (centroid_embedding, level partition key)
   - `clustering_runs` audit table
4. Run pipeline: extract → normalize → KNN → igraph → recursive Leiden → centroids → write
5. Verify cluster counts: `SELECT level, COUNT(*) FROM clusters GROUP BY level`
   - Target: ~40 L0, ~400 L1, ~4000 L2
6. Inspect quality: check 5 largest + 5 smallest clusters at each level
7. Compute silhouette score baseline for future drift detection

## Memory Plan

Kill Ollama + heavy processes before starting. Peak ~3.6 GB during steps 1-5.

| Step | Memory | Time |
|------|--------|------|
| Extract embeddings | ~1 GB | 2-3 min |
| L2 normalize | +0 MB | seconds |
| Faiss KNN k=30 | ~2 GB | 5-15 min |
| igraph construction | ~400 MB | 1-2 min |
| Recursive Leiden | ~200 MB | 5-10 min |
| Centroids + write | ~50 MB | 2-3 min |

## Depends On
- Phase 1 (embeddings must be meaningful for all sources)

## Status
- [ ] Install faiss-cpu
- [ ] Create clustering.py
- [ ] Create SQLite migration
- [ ] Run clustering pipeline
- [ ] Verify cluster counts and quality
- [ ] Record silhouette baseline
