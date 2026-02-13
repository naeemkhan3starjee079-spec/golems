# Phase 4: Brain View

> [Back to main plan](../README.md)

## Goal

The main event. Interactive 3D knowledge graph with the neural-network / star-map aesthetic. Bloom, particles, semantic zoom, search-to-highlight, camera fly-to.

## Tools

- **Research:** Gemini — react-force-graph-3d + Three.js bloom examples
- **Code:** Cursor for Three.js shaders/effects, Opus for data wiring
- **MCPs:** None

## Steps

1. Install: `react-force-graph-3d`, `three` (+ types)
2. Dynamic import with `ssr: false` (Three.js can't SSR)
3. Load graph.json (static file or from API)
4. Basic force-directed graph rendering — nodes + edges working
5. **Node styling:**
   - Size = composite score (session count + importance + recency + file count)
   - Color = dominant operation type (cyan=feature, rose=debug, purple=research, emerald=edit, amber=config)
   - Emissive glow via `MeshStandardMaterial` with `emissiveIntensity`
6. **Edge styling:**
   - Default: `rgba(148, 163, 184, 0.15)` — barely visible
   - Highlighted: `rgba(0, 212, 255, 0.6)` — bright cyan
   - Particle trails: `linkDirectionalParticles` proportional to edge weight
7. **Bloom post-processing:**
   - Three.js `EffectComposer` + `UnrealBloomPass`
   - Strength: 1.5, radius: 0.4, threshold: 0.8
   - Selective bloom (only high-importance nodes)
8. **Semantic zoom (3 levels):**
   - Zoomed out: super-nodes only (~100), labels for top 20
   - Mid zoom: communities expanded (~500-2K), labels for focused nodes
   - Close zoom: individual sessions, full metadata on hover
9. **Interactions:**
   - Hover → tooltip (node name, type, date range, importance)
   - Click → side panel with details (files, operations, summary, linked sessions)
   - Click → camera fly-to animation
   - Search bar → highlight matching nodes, dim others
   - Number keys (1-3) → show N hops from selected node
10. **Background:** `#0A0E1A` (blue-tinted near-black)
11. **Minimap** in corner (optional: Sigma.js 2D overview)

## Depends On

- Phase 1 (graph.json)
- Phase 3 (frontend shell)

## Status

- [ ] react-force-graph-3d setup
- [ ] Basic graph rendering
- [ ] Node styling (size, color, glow)
- [ ] Edge styling (dim, particles)
- [ ] Bloom post-processing
- [ ] Semantic zoom
- [ ] Hover tooltips
- [ ] Click → side panel
- [ ] Camera fly-to
- [ ] Search-to-highlight
- [ ] Minimap
