# Zikaron Brain View — Design Doc

> Visual, interactive knowledge graph for Zikaron memory data. Presentation-ready.  
> Research and architecture comparison for web-based "Brain View."

---

## 1. Executive Summary

**Goal:** Build a web-based "Brain View" that visualizes Zikaron's knowledge base (240K+ chunks, sessions, plans, operations, temporal chains) as an interactive, presentation-ready graph.

**Constraints:**
- Data lives in sqlite-vec (`~/.local/share/zikaron/zikaron.db`)
- Must work on localhost and optionally deploy to etanheyman.com
- Existing: FastAPI daemon (Unix socket), MCP server (stdio), Rich TUI dashboard

**Recommended path:** Extend the existing FastAPI daemon with HTTP endpoints for Brain View data, then build a frontend with **Next.js + react-force-graph** for interactive 3D graphs. Use Astro + vis.js only if you prefer a lighter static-first deployment.

---

## 2. Current Zikaron Data Model

### Core Tables (`vector_store.py`)

| Table | Purpose |
|-------|---------|
| `chunks` | 240K+ indexed chunks with content, metadata, project, content_type |
| `chunk_vectors` | 1024-dim embeddings (bge-large-en-v1.5) via sqlite-vec |
| `chunks_fts` | FTS5 full-text for hybrid search |
| `session_context` | Git overlay: branch, PR, commits, files_changed, plan_name, plan_phase, story_id |
| `file_interactions` | Per-file: timestamp, session_id, action, chunk_id, project |
| `operations` | Grouped: operation_type, chunk_ids, summary, outcome, started_at, ended_at |
| `topic_chains` | Links sessions by shared file: session_a, session_b, shared_actions, time_delta_hours |

### Data Scale (from CLAUDE.md)

- **~240K chunks** indexed
- **5+ sessions** (likely more: sessions = agent conversations)
- **100+ files** touched across sessions
- **Plans** from `docs/plan/*/README.md` with phase/branch/PR mappings
- **Operations** from `operation_grouping.py`: edit-cycle, research, feature-cycle, debug, config, review

### Enrichment Metadata (per chunk)

- `summary`, `importance`, `intent`, `tags`, `enriched_at`

### Pipeline Sources

- `pipeline/extract.py` — JSONL conversations
- `pipeline/temporal_chains.py` — file→session links, time deltas
- `pipeline/plan_linking.py` — session→plan links
- `pipeline/operation_grouping.py` — chunk→operation groups

---

## 3. Brain View — Views to Design

### 3.1 Star-System Graph

**Concept:** Nodes = projects (center), sessions (orbits), files (satellites). Edges = file→session, session→project.

- **Center:** Top projects (by chunk count)
- **Orbits:** Sessions linked by project
- ** peripherals:** Files touched in those sessions
- **Size:** Node size ∝ chunk count or importance
- **Color:** content_type or intent

**Data:** `get_stats()`, `get_sessions_by_plan()`, `file_interactions`, `session_context`

### 3.2 Timeline

**Concept:** Horizontal time axis. Sessions as blocks. Operations as sub-blocks.

- **X-axis:** Time (started_at, ended_at)
- **Y-axis:** Project or session
- **Blocks:** Operations with outcome (success/fail)
- **Tooltips:** Chunk summary, file path

**Data:** `session_context`, `operations`, `file_interactions`

### 3.3 File Heatmap

**Concept:** Rows = files, columns = time buckets. Color = interaction count.

- **Rows:** Files (sorted by total interactions)
- **Columns:** Week or day buckets
- **Cell:** Heat intensity (read/edit/write)

**Data:** `file_interactions` grouped by file_path, timestamp, action

### 3.4 Plan Progress

**Concept:** Tree or kanban: Plan → Phase → Story → Sessions.

- **Nodes:** Plan, Phase, Story, Session
- **Edges:** Parent-child
- **Status:** Progress from `docs/plan/*/README.md` or inferred from session outcome

**Data:** `get_sessions_by_plan()`, `get_plan_linking_stats()`, plan README parsing

**Optional:** Topic chains (session_a → session_b) as edges between sessions

---

## 4. Data Access — How to Query

### 4.1 Direct sqlite-vec

- **Path:** `~/.local/share/zikaron/zikaron.db`
- **Pros:** Single source, no extra service
- **Cons:** Browser can’t open DB directly; needs backend

### 4.2 Extend Existing FastAPI Daemon

**Current:** `daemon.py` runs on `/tmp/zikaron.sock` (Unix socket). Endpoints: `/health`, `/stats`, `/search`, `/context/{chunk_id}`.

**Add:** HTTP mode (e.g. `--http` flag) for `localhost:8765` or `127.0.0.1:8765` so browser can call it.

**New endpoints for Brain View:**

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/brain/graph` | GET | `{ nodes, edges }` for star-system graph |
| `/brain/timeline` | GET | `{ events, sessions }` for timeline |
| `/brain/heatmap` | GET | `{ file_path, buckets, counts }` for heatmap |
| `/brain/plans` | GET | `{ plans, phases, sessions }` for plan progress |
| `/brain/topic-chains` | GET | `{ chains }` for session→session links |

**Pros:** Reuses existing VectorStore, embeddings, no new process.  
**Cons:** Daemon must be running; local-only unless you add CORS.

### 4.3 MCP Server Pattern

- **Current:** MCP uses stdio; no HTTP.
- **Option:** Run MCP server separately with HTTP transport (e.g. MCP-over-HTTP).  
- **Verdict:** Not ideal for Brain View. MCP is for Claude; use FastAPI for browsers.

### 4.4 Standalone FastAPI Brain API

- **Path:** `packages/zikaron/src/zikaron/brain_api.py` or `/brain/` subfolder
- **Start:** `uvicorn zikaron.brain_api:app --port 8765`
- **Data:** Import VectorStore, add aggregation endpoints
- **Pros:** Clean separation; can run alongside daemon
- **Cons:** Two processes; DB open twice (or share via connection)

### 4.5 Recommendation

**Extend the daemon** with HTTP mode and Brain View endpoints. Add `--http 8765` to `daemon.py` so it can serve both:

- Unix socket (for CLI / search-fast)
- HTTP (for Brain View frontend)

Alternatively, mount Brain API in the same FastAPI app under `/brain/*`.

---

## 5. Tech Stack Comparison

### Option A: Next.js + D3/react-force-graph

| Aspect | Assessment |
|------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **Graph lib** | `react-force-graph` (vasturiano) — 3D variant uses ThreeJS/WebGL |

**Pros:**
- Rich 3D graph (zoom, pan, node drag)
- Customizable nodes (text, images, HTML)
- Good for 100k+ nodes with proper sampling
- Familiar React ecosystem
- TypeScript support

**Cons:**
- Heavier bundle (~500KB+ with ThreeJS)
- Requires React; not ideal for static-only

**Data flow:** API routes in Next.js call FastAPI daemon; or proxy to backend.

**Presentation:** Can embed in slides, full-screen, or export to PNG.

---

### Option B: Astro + vis.js

| Aspect | Assessment |
|------|------------|
| **Framework** | Astro (static-first) |
| **Graph lib** | vis.js Network |

**Pros:**
- Lightweight static site
- Fast initial load
- vis.js handles 2D graphs well
- Can hydrate only graph island

**Cons:**
- 2D only (no 3D)
- vis.js physics can be slow with 1000+ nodes; pre-compute layout
- For 240K chunks: need aggregation (don’t render 240K nodes)

**Data flow:** Astro endpoints (`src/pages/api/*.ts`) fetch from FastAPI backend; or build-time JSON if static.

**Presentation:** Static export; can deploy to Vercel/Netlify easily.

---

### Option C: Astro + react-force-graph

- Astro for static shell; React island for 3D graph.
- Pros: Light shell + strong graph. Cons: Adds React/ThreeJS to Astro.

---

### Option D: Vanilla + D3.js

- No framework; D3 for force layout.
- Pros: Minimal deps. Cons: More manual work; no 3D out of the box.

---

## 6. Stack Recommendation Summary

| Use case | Stack |
|----------|-------|
| **Interactive 3D, presentation-ready** | Next.js + react-force-graph |
| **Lighter, static-first** | Astro + vis.js (2D) |
| **Compromise** | Astro + react-force-graph island |

**Recommendation:** **Next.js + react-force-graph** for Brain View because:

1. 3D star-system view fits the “knowledge graph” metaphor.
2. Timeline and heatmap can be separate charts (D3 or Chart.js).
3. Plan progress can be a tree or force-directed graph.
4. Next.js API routes can proxy to Zikaron daemon.
5. Deployment to Vercel/etanheyman.com is straightforward.

---

## 7. Architecture diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ZIKARON BRAIN VIEW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────────────┐                    ┌────────────────────────────────┐ │
│   │ ~/.local/share/      │                    │  Next.js / Astro Frontend      │ │
│   │ zikaron/zikaron.db   │                    │                                │ │
│   │                      │                    │  • Star-system graph (3D)     │ │
│   │ sqlite-vec           │                    │  • Timeline                    │ │
│   │ chunks, sessions,    │                    │  • File heatmap                │ │
│   │ operations, chains   │                    │  • Plan progress              │ │
│   └──────────┬───────────┘                    └────────────────▲───────────────┘ │
│              │                                                    │                │
│              │                                                    │                │
│              ▼                                                    │                │
│   ┌──────────────────────┐                    ┌────────────────────────────────┐ │
│   │  Zikaron Daemon       │  HTTP/JSON          │  Brain API Endpoints            │ │
│   │  (FastAPI)            │ ──────────────────► │  GET /brain/graph               │ │
│   │                       │ localhost:8765     │  GET /brain/timeline            │ │
│   │  • /search            │ or /tmp/zikaron.sock│  GET /brain/heatmap             │ │
│   │  • /stats             │                    │  GET /brain/plans               │ │
│   │  • /context/{id}      │                    │  GET /brain/topic-chains       │ │
│   └──────────────────────┘                    └────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Options

### Localhost

- **Daemon:** `zikaron daemon --http 8765` (or `uvicorn`)
- **Frontend:** `cd brain-view && npm run dev` → `localhost:3000`
- **CORS:** Allow `localhost:3000` in daemon

### etanheyman.com

- **Option 1:** Static export (Astro) → Vercel/Netlify. Brain API must be reachable from browser → **problem:** DB is on your machine.
- **Option 2:** Deploy daemon + frontend together (e.g. Railway, Render). DB would need to be hosted (e.g. DB file in volume, or migrate to cloud).
- **Option 3:** Pre-generate JSON at build time. Run `zikaron export-brain-data` locally and commit JSON to repo. Frontend is static; no live DB.

**Practical recommendation:** For etanheyman.com, use **pre-generated JSON** for now. Run a script locally that:

1. Queries VectorStore for graph/timeline/heatmap/plans
2. Writes JSON to `brain-view/public/data/`
3. Deploy static site; frontend loads JSON

No public DB needed; data refreshes on deploy.

---

## 9. Implementation Phases

### Phase 1: API layer

- [ ] Add `--http` to daemon or extend FastAPI app
- [ ] Implement `/brain/graph`, `/brain/timeline`, `/brain/heatmap`, `/brain/plans`
- [ ] Add `VectorStore` methods for aggregation (e.g. `get_graph_data()`)

### Phase 2: Frontend shell

- [ ] Next.js or Astro project
- [ ] Fetch from API (or static JSON)
- [ ] Layout: sidebar + main view + view switcher

### Phase 3: Star-system graph

- [ ] Integrate react-force-graph
- [ ] Node types: project, session, file
- [ ] Edge logic from `session_context` + `file_interactions`

### Phase 4: Timeline + heatmap + plans

- [ ] Timeline: D3 or vis.js timeline
- [ ] Heatmap: D3 or custom SVG/Canvas
- [ ] Plan progress: tree or hierarchical graph

### Phase 5: Polish

- [ ] Tooltips, filters
- [ ] Export to PNG/PDF for presentations
- [ ] Refresh/export script for static deploy

---

## 10. Summary of key decisions

| Decision | Choice |
|----------|--------|
| **Data source** | sqlite-vec via VectorStore |
| **API** | Extend FastAPI daemon with `/brain/*` endpoints |
| **Frontend stack** | Next.js + react-force-graph (primary) |
| **Alternative** | Astro + vis.js (if static-first is priority) |
| **Deployment** | Localhost: daemon + dev server. Static: pre-generated JSON. |
| **Scale** | Aggregate; don’t render 240K nodes — sample or cluster by project/session |

---

## 11. References

- **Zikaron:** `packages/zikaron/src/zikaron/` — pipeline, vector_store, daemon, mcp
- **react-force-graph:** https://github.com/vasturiano/react-force-graph
- **vis.js Network:** https://visjs.github.io/vis-network/
- **sqlite-vec:** https://github.com/asg017/sqlite-vec
- **FastAPI:** Existing daemon in `daemon.py`
