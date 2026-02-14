# Phase 7: Visualization (Treemap + 3D Hulls)

> [Back to main plan](../README.md)

## Goal

Add cluster hierarchy visualization to the Ops Dashboard with treemap browsing and 3D hull overlays.

## Tools
- **Code:** Plotly.js (treemap/sunburst), Three.js ConvexGeometry
- **Dashboard:** Existing Next.js Ops Dashboard

## Steps

1. **Plotly treemap** — Zoomable, click-to-drill-down
   - Three flat arrays: labels, parents, values (chunk counts)
   - Pathbar breadcrumb navigation
   - ~50 lines of code, handles 5K nodes natively
2. **Sunburst chart** — Same data, alternative view
   - Inner ring: L0 domains, middle: L1 topics, outer: L2 leaves
   - Toggle button between treemap/sunburst
3. **Three.js hull overlays** — Semi-transparent convex hulls per cluster
   - ConvexGeometry from member chunk 3D positions
   - MeshBasicMaterial transparent, opacity 0.15
   - Level-of-detail: L0 hulls at default zoom (~40 meshes), L1 on zoom-in (~500)
4. **Linked views** — Click treemap → fly 3D camera to cluster centroid + render hull
   - Hover 3D chunk → highlight cluster path in treemap
5. **Data API** — Dashboard endpoint to fetch cluster hierarchy from SQLite
6. Reuse existing UMAP 3D coordinates from brain_graph.py

## Depends On
- Phase 2 (clusters), Phase 3 (labels)
- Existing brain graph (Three.js 3D view, UMAP coordinates)

## Status
- [ ] Plotly treemap component
- [ ] Sunburst toggle
- [ ] Three.js hull overlays
- [ ] Linked views (treemap ↔ 3D)
- [ ] Data API endpoint
