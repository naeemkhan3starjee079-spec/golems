# Phase 2 Findings

## Decisions
- Resolution starting points: L0 ~0.005, L1 ~0.05, L2 ~0.5 (need binary search tuning)
- k=30 for KNN graph (standard for 245K scale)
- Level targets: [40, 10, 10] — 40 top clusters, ~10 sub per parent, ~10 leaf per sub

## Research
- Recursive Leiden guarantees perfect nesting (unlike HDBSCAN condensed tree)
- L2 normalization required before Faiss IndexFlatIP (converts dot product → cosine)
- Directed→undirected conversion: collapse mode with max weight combination
- Schema uses both adjacency list (parent_id) and materialized path for flexibility

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Implement clustering.py | - | pending |
| Design + test SQLite schema | - | pending |
