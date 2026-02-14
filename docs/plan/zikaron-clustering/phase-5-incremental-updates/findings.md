# Phase 5 Findings

## Decisions
- Running mean for centroid updates (fast, good enough for 4-6 weeks)
- Monthly true centroid recompute to correct drift

## Research
- HDBSCAN approximate_predict() is transductive — can alter entire hierarchy
- Leiden incremental: add nodes/edges to existing graph, re-run affected partitions
- At 750 chunks/day growth (~3%/week), incremental degrades gracefully for 4-6 weeks

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Implement assignment logic | - | pending |
| Design health check criteria | - | pending |
