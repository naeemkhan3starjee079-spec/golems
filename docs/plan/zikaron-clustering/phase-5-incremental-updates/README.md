# Phase 5: Incremental Updates

> [Back to main plan](../README.md)

## Goal

Enable new chunks to join existing clusters without re-clustering, with automatic health monitoring and periodic rebuilds.

## Tools
- **Code:** Python (clustering.py additions)
- **Scheduling:** Cron or NightShift integration

## Steps

1. **Per-chunk assignment** — Top-down nearest-centroid routing:
   - Find nearest L0 centroid → nearest L1 within that parent → nearest L2 within that parent
   - 5,550 distance computations total (50 + 500 + 5000) — milliseconds
2. **Running centroid update** — `new = (old × n + embedding) / (n + 1)`
3. **KNN voting safeguard** — Find 10 nearest existing chunks, check cluster votes
   - If KNN disagrees with centroid assignment → flag in staging table
4. **Daily health check** cron job:
   - Size split: leaf cluster exceeds 3× average size → 2-means split
   - Variance split: avg intra-distance exceeds 2× global average → BIC test
   - Merge detection: sibling centroids closer than cosine 0.1 → merge + relabel
5. **Weekly silhouette sampling** — 5K random chunks, track drift
6. **Full re-cluster trigger** — silhouette drops >10% from baseline (every 4-6 weeks)
7. Wire into indexing pipeline: after `zikaron index`, new chunks get cluster assignments
8. Add `--recluster` flag to CLI for manual full rebuild

## Schedule

| Action | Frequency | Trigger |
|--------|-----------|---------|
| Centroid assignment | Per-chunk | Every new chunk ingestion |
| Health check | Daily | Cron / NightShift |
| Silhouette sampling | Weekly | Cron |
| Full re-cluster | Every 4-6 weeks | Silhouette drift > 10% |

## Depends On
- Phase 2 (clustering infrastructure)

## Status
- [ ] Implement per-chunk assignment
- [ ] Implement running centroid update
- [ ] Implement KNN voting safeguard
- [ ] Implement daily health check
- [ ] Wire into indexing pipeline
- [ ] Add CLI --recluster flag
