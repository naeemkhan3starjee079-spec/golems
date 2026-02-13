# Building a presentation-ready Brain View for AI agent memory

**react-force-graph-3d on Next.js, powered by Leiden community detection and deployed as a hybrid static/edge architecture on Vercel, is the optimal stack for turning 240K conversation chunks into a stunning, interactive knowledge graph.** This combination delivers the "star map" aesthetic with WebGL bloom effects, handles 500–5,000 nodes smoothly, integrates natively with React, and costs under $10/month to host. The key insight across all research areas is that the aggregation pipeline — not the visualization library — is the hardest and most consequential design decision.

---

## The visualization library landscape has a clear winner for 3D brain aesthetics

After comparing eight major graph visualization libraries across performance, 3D capability, React integration, and customization, **react-force-graph-3d** emerges as the best fit for this specific use case. It is a native React component built on Three.js and d3-force-3d, providing WebGL-rendered 3D force-directed graphs with built-in zoom, pan, click, hover, drag, and — critically — **directional particle effects along edges** out of the box.

| Library | Renderer | 3D | Max nodes (smooth) | React wrapper | Bundle (gzip) |
|---|---|---|---|---|---|
| **react-force-graph-3d** | WebGL (Three.js) | ✅ Native | ~3,000 | IS the wrapper | ~300KB |
| Sigma.js v3 | WebGL | ❌ | 50,000+ | @react-sigma | ~20KB |
| G6 v5 (AntV) | Canvas/WebGL | ✅ Plugin | ~5,000 | Graphin | ~150KB |
| Cytoscape.js | Canvas | ❌ | ~5,000 | react-cytoscapejs | ~55KB |
| Cosmograph | WebGL (GPU) | ❌ | 100,000+ | ❌ | ~30KB |
| vis-network | Canvas | ❌ | ~1,000 | Community | ~120KB |

react-force-graph-3d handles **500–2,000 nodes effortlessly** and remains viable up to 5,000 with optimization (reducing link particles, simplifying node geometries, tuning `cooldownTicks`). Its Three.js foundation enables bloom post-processing via `UnrealBloomPass`, custom emissive materials for glowing nodes, and camera fly-to animations — all essential for the neural network aesthetic.

The main trade-off is **bundle size**: Three.js adds ~300KB gzipped, requiring lazy loading via `dynamic(() => import('react-force-graph-3d'), { ssr: false })` in Next.js. It also only supports force-directed layout (no hierarchical or radial options natively), meaning node positioning relies on force tuning or pre-computed coordinates.

**G6 v5 by AntV** deserves consideration as a runner-up. It offers built-in **level-of-detail rendering** (labels and icons appear progressively at different zoom levels), a native dark theme, 10+ layout algorithms, and the unique ability to render React components as graph nodes via `@antv/g6-extension-react`. However, its documentation remains partially in Chinese, and its 3D support is less mature than react-force-graph-3d.

**Sigma.js v3** is the performance king for 2D — rendering 50,000+ nodes at 60fps via WebGL — but lacks any 3D capability. It pairs with the excellent **Graphology** library for graph data structures and algorithms. For a 2D fallback or a "large overview" mode, Sigma.js is unmatched.

**WebGPU** achieved cross-browser support in January 2026, but no major graph library has adopted it yet. Three.js supports WebGPU since r171 with automatic WebGL2 fallback, so react-force-graph-3d could theoretically leverage it in the future.

---

## How the best knowledge tools make graphs readable, not just beautiful

Studying Obsidian, Neo4j Bloom, Kumu.io, and Logseq reveals that **the UX patterns matter more than the rendering engine**. The most effective knowledge graph interfaces share several critical patterns that transform visual noise into navigable information.

**Search-to-highlight with contextual dimming** is the single most impactful UX pattern. Neo4j Bloom pioneered a "search-to-visualization" paradigm where near-natural language queries instantly build the visible graph. When a user searches, matching nodes glow at full brightness while non-matching nodes and edges dim to 10–20% opacity. This transforms the graph from an overwhelming hairball into a focused answer. In react-force-graph-3d, this is achievable through the `nodeColor` and `linkColor` callbacks, dynamically returning dimmed values for non-matching elements.

**Semantic zoom with 3–5 discrete levels** prevents information overload at every scale. Unlike geometric zoom (which just scales everything), semantic zoom changes what's displayed: at the outermost level, show only ~50–100 project-level super-nodes with color-coded categories; at mid-zoom, expand to ~500 topic clusters with labels; at close zoom, show individual sessions with full metadata. G6 v5 implements this natively, but it can be hand-built in react-force-graph-3d using the `nodeThreeObject` callback with a zoom-level check.

**Progressive disclosure through expand/collapse** follows Kumu.io's three-mechanism model: **Filter** (hide elements entirely), **Focus** (show N degrees from selected node), and **Showcase** (make non-matching elements translucent). The Focus pattern — pressing a number key to show 1, 2, or 3 hops from a clicked node — is particularly powerful for exploring how coding sessions connect across projects.

**A side panel for detail, tooltips for glance** is the consensus pattern. Hover triggers a lightweight tooltip (session name, date, importance score); click opens a side panel with full details (files touched, operation type, git branch, summary, linked sessions). Repeating graph-visible information in the panel wastes space — show only what can't fit in the graph.

**Time-based filtering** via a scrubable slider is underused but powerful. Obsidian's "Animate" feature shows vault growth chronologically. For coding session data with rich timestamps, a timeline slider that shows graph evolution over weeks or sprints would reveal how projects emerge, peak, and conclude — turning the Brain View into a narrative device for presentations.

---

## From 240K chunks to 2,000 meaningful nodes: the aggregation pipeline

The aggregation pipeline is the most technically challenging component. The recommended approach combines Microsoft's GraphRAG methodology with the BERTopic clustering pipeline, adapted for coding session data.

**The pipeline has eight phases**, flowing from raw chunks to a visualization-ready JSON graph. First, group the 240K chunks into sessions (a natural boundary from conversation data). Then compute session-level features by mean-pooling chunk embeddings, aggregating files touched, and collecting metadata. Next, build a **hybrid similarity graph** between sessions using a weighted combination: **40% cosine similarity** of session embeddings, **35% Jaccard similarity** of files touched, **15% temporal proximity** (exponential decay), and **10% same-branch/PR bonus**. Threshold this to keep the top 25% of edges, creating a sparse weighted graph.

Apply **hierarchical Leiden community detection** on this graph. Leiden is strictly superior to Louvain — it guarantees connected communities (Louvain can produce up to 25% disconnected communities), converges faster, and produces higher-quality partitions. The `graspologic` library (Microsoft's, used in GraphRAG) provides hierarchical Leiden out of the box:

```python
from graspologic.partition import hierarchical_leiden
community_mapping = hierarchical_leiden(G, max_cluster_size=100)
```

Tune the `resolution_parameter` between 0.1 and 0.5 to hit the 500–2,000 node target. Generate three hierarchy levels: coarse (~100 nodes), medium (~500–2,000), and fine (~2,000–5,000) for progressive disclosure.

**For super-node labeling**, use c-TF-IDF (the BERTopic method) on concatenated session summaries per cluster for speed, optionally refined with an LLM pass for user-facing labels. **Size each node** using a composite score: 30% normalized session count + 30% normalized average importance + 20% recency + 20% file count. **Color by dominant operation type**: feature-cycle (cyan), debug (rose), research (purple), edit-cycle (emerald).

For the embedding-based clustering path, the proven BERTopic pipeline applies: existing sqlite-vec embeddings → **UMAP** (to 10 dimensions for clustering, separately to 2D for layout) → **HDBSCAN** (with `min_cluster_size` tuned for target granularity). UMAP with `metric='cosine'` and `min_dist=0.0` produces tight clusters ideal for HDBSCAN. For 240K vectors, use RAPIDS `cuml` for GPU-accelerated UMAP and HDBSCAN — **47x faster** than CPU for Leiden at this scale.

The critical insight is that **hybrid similarity outperforms pure semantic similarity**. Pure embedding cosine similarity misses structural relationships (two sessions editing the same config file for different reasons), while pure file-overlap misses conceptual links (two sessions about authentication using different files). The weighted combination captures both.

---

## The hybrid deployment architecture balances speed, cost, and dynamism

Four architectures were evaluated. The **hybrid approach** — pre-generated static JSON for graph structure plus edge SQLite for search — dominates across all factors for this use case.

| Approach | Load time | Search latency | Monthly cost | Complexity |
|---|---|---|---|---|
| Full-stack (FastAPI + Next.js) | 1.5–3s | 50–500ms | $5–50 | High |
| Pre-generated static JSON | 0.5–2s | Client-only | $0–5 | Low |
| **Hybrid (static + edge DB)** | **0.5–1.5s** | **10–100ms** | **$0–10** | Medium |
| Client-side compute | 1–4s | <20ms (after load) | $0 | Medium-high |

At 2,000 nodes with ~6,000 edges, the graph JSON is roughly **3–5MB uncompressed, ~1MB with Brotli** — well within browser-friendly territory. This eliminates the need for a persistent backend for graph rendering. Deploy the Next.js app on **Vercel** (free tier: 100GB bandwidth) with the graph JSON as a static asset.

For search and drill-down into the full 240K chunks, use **Turso** (edge SQLite) queried via Vercel Edge Functions. Turso's free tier provides 1 billion row reads per month and 1GB storage — more than sufficient. Edge Functions execute in <1ms cold-start time (V8 isolates), and Turso's embedded replicas deliver microsecond-level reads. The result: **sub-100ms search globally** with zero backend servers to manage.

The architecture:
```
User → Vercel CDN → Static Next.js + graph.json (instant load)
                  → Edge Function /api/search → Turso (FTS5 index on 240K chunks)
                  → Edge Function /api/node/:id → Turso (session detail + linked chunks)
```

For incremental updates: add new sessions by updating the Turso database (no redeploy needed for search); rebuild the static graph JSON only when the topology meaningfully changes (weekly batch job). Use `AlignedUMAP` from umap-learn to keep layout stable across rebuilds.

---

## Achieving the neural-network star-map aesthetic

The "star map" look requires five visual layers working together: a deep dark background, glowing nodes, semi-transparent edges with particle flow, bloom post-processing, and careful color temperature.

**Background**: Use `#0A0E1A` (blue-tinted near-black), never pure `#000000`. This creates depth and allows subtle visual hierarchy. For surface elements like the side panel, use `#111827`; borders at `#334155`.

**Node glow**: In Three.js (via react-force-graph-3d), create custom node objects using `MeshStandardMaterial` with `emissive` and `emissiveIntensity` properties. Brighter emissive values on important nodes make them "burn" through the bloom pass. Size encodes importance; color encodes operation type. Recommended palette for dark backgrounds: electric cyan `#00D4FF` (primary), soft purple `#8B5CF6` (secondary), emerald `#10B981` (tertiary), amber `#F59E0B` (warning), rose `#F43F5E` (highlight).

**Bloom post-processing**: Add Three.js `EffectComposer` with `UnrealBloomPass` (strength: 1.2–1.8, radius: 0.3–0.5, threshold: 0.7–0.9). For selective bloom (only specific nodes glow), use a two-pass approach: assign glowing objects to a separate layer, render bloom only for that layer, then composite. The `pmndrs/postprocessing` library offers better performance than Three.js built-in effects.

**Particle trails**: react-force-graph-3d provides this natively via `linkDirectionalParticles` (number per edge), `linkDirectionalParticleSpeed` (0.001–0.005), and `linkDirectionalParticleColor`. Set particle count proportional to edge weight — heavily-connected clusters pulse with visible data flow, while weak connections show sparse, slow particles.

**Edge styling**: Default edges at `rgba(148, 163, 184, 0.15)` — barely visible until hovered or highlighted. Highlighted edges jump to `rgba(0, 212, 255, 0.6)`. This constellation effect (dim connections, bright nodes) is what makes the star-map metaphor work.

**Animated transitions**: Camera fly-to on node click (`cameraPosition` with duration animation), pulsing keyframe animation on recently-active nodes (scale oscillation between 1.0 and 1.15 over 2s), and smooth expand/collapse when drilling into super-nodes.

---

## Existing projects provide both code and architectural validation

Several open-source projects directly address parts of the Brain View concept. **Graphiti** (by Zep, ~3,500 GitHub stars, Apache 2.0) builds temporally-aware knowledge graphs from AI agent conversations and provides dashboard visualization — the closest existing system to what's being built. **Mem0** (~25,000 stars) demonstrates graph memory extraction from AI interactions with built-in visualization. **CASS** (Coding Agent Session Search) directly indexes Claude Code sessions with search and filtering, providing the data layer that a graph visualization would sit on top of.

For implementation references, **Claude MCP Memory Visualizer** renders Claude's memory.json as interactive force-directed graphs using NetworkX and PyVis. **LLM Canvas** and **Canvas Chat** visualize LLM conversation flows as DAGs on infinite canvases. **Neo4j's LLM Knowledge Graph Builder** (2,800 stars, Apache 2.0) provides a complete full-stack reference: React frontend + FastAPI backend + Neo4j + LLM extraction → interactive graph visualization.

A particularly useful tutorial is William Lyon's "Graph Data Visualization with GraphQL & react-force-graph," which walks through building a Next.js + react-force-graph visualization with Neo4j data, covering SSR handling and data transformation. A separate tutorial by gwzz demonstrates force-graph-3d specifically in Next.js with knowledge graph data.

**Reagraph** (~500 stars, Apache 2.0) is worth noting as a more feature-rich alternative to react-force-graph — it includes built-in clustering visualization, path-finding, edge bundling, radial context menus, and lasso selection, all in WebGL. If the project needs more built-in interaction patterns without custom Three.js code, Reagraph is the strongest contender.

---

## Recommended tech stack and implementation roadmap

Based on all research, here is the specific recommended stack:

**Aggregation pipeline (Python)**:
- `graspologic` for hierarchical Leiden community detection (GraphRAG-style)
- `umap-learn` for dimensionality reduction and 2D layout computation
- `hdbscan` for density-based clustering of embeddings
- `igraph` + `leidenalg` for graph operations and community detection
- `networkx` for graph construction and JSON export
- `scikit-learn` for preprocessing and metrics
- `sqlite-vec` (existing) as the source database

**Frontend (TypeScript/React)**:
- **Next.js 14+** with App Router, deployed on Vercel
- **react-force-graph-3d** (v1.48+) as the primary renderer, dynamically imported with `ssr: false`
- **Three.js EffectComposer** + `UnrealBloomPass` for bloom post-processing
- **Turso** client (`@libsql/client`) for edge database queries
- **Tailwind CSS** for the UI shell, side panels, and filtering controls

**Deployment**:
- **Vercel** for hosting (free tier sufficient initially)
- **Turso** for edge SQLite (free tier: 1B reads/month)
- Static `graph.json` regenerated via Python script on data changes
- Turso DB updated incrementally as new sessions arrive

**Implementation sequence**: Build the aggregation pipeline first (this is the hardest part and determines visualization quality), then create a minimal react-force-graph-3d prototype with static data, then add bloom effects and particle trails, then wire up Turso for search/drill-down, and finally polish with semantic zoom, time filtering, and presentation transitions.

## Conclusion

The Brain View is entirely buildable with current open-source tools. The most underappreciated insight from this research is that **Leiden community detection on a hybrid similarity graph** (combining semantic embeddings with file co-occurrence and temporal proximity) produces dramatically better clusters than any single similarity metric alone — this is what will make the difference between a pretty graph and a genuinely useful one. The react-force-graph-3d + Three.js bloom combination has been validated by multiple existing projects for exactly this aesthetic. And the hybrid static-plus-edge-database deployment means the entire system can run for under $10/month while loading in under 1.5 seconds globally. The hardest remaining challenge is not technical but editorial: deciding what level of aggregation makes each super-node meaningful enough to be worth clicking on.