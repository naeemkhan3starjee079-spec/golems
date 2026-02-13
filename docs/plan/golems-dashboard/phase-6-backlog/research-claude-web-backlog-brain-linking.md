# Linking a 3D knowledge graph to your backlog board

**Embedding-based linking between your Brain View and backlog is both technically straightforward and architecturally novel — no existing tool does this well.** At 2,500 vectors with 1024 dimensions, pgvector handles brute-force similarity search in under 5ms without any index, making query-time matching the clear winner over precomputed link tables. The recommended architecture embeds backlog items at write time using the same bge-large-en-v1.5 model locally (~30ms per item on M1 Pro), stores vectors in Supabase, and runs similarity search on demand when a user selects an item. This approach eliminates stale-link maintenance, keeps the system simple, and delivers sub-10ms response times for the "find related sessions" query.

The broader product landscape confirms you're building something genuinely new. Tana and Anytype treat tasks as first-class graph nodes, Atlassian's Teamwork Graph connects Jira to Confluence via entity linking, but **no tool automatically links project tasks to knowledge artifacts using semantic embeddings**. Academic literature shows a matching gap — extensive work on knowledge-graph-aware recommendation systems exists, but nothing specifically addresses task↔knowledge-base linking with modern embeddings.

---

## The embedding pipeline should be batch-local, query-time search

The most critical architectural decision is where and when embeddings get computed. Given that bge-large-en-v1.5 runs locally on your Mac but the dashboard deploys to Vercel, a clean separation works best: **local batch script handles all embedding, Supabase stores vectors, Vercel reads results**.

**Embed backlog items at write time.** When a backlog item is created — whether from the dashboard, Telegram, Claude agent, or voice — queue it for embedding. A local Python or Node script using Sentence Transformers with the ONNX backend processes the queue, producing a 1024-dim vector in **20–50ms per item**. For the instruction prefix that BGE models expect on short queries, prepend `"Represent this sentence for searching relevant passages: "` to backlog text before embedding. Do not add this prefix to session embeddings — BGE documentation specifies instructions only for queries, never passages.

**Run similarity search at query time.** When a user clicks a backlog item, fire a pgvector query: one embedding against 2,500 stored session embeddings. AWS, Neon, and pgvector's own documentation all confirm that **sequential scan at this scale delivers sub-5ms latency with 100% recall**. No HNSW or IVFFlat index is needed — at 2,500 rows, indexes add build-time overhead and memory cost with negligible latency improvement. The entire dataset (~10MB in float32) fits comfortably in PostgreSQL's shared buffers.

**Cosine similarity threshold: start at 0.65, floor at 0.50.** BGE v1.5 was specifically updated to produce better-calibrated similarity distributions than v1.0. Practical RAG systems typically use 0.7–0.75 for tight relevance and 0.5–0.6 for broader topical association. For your use case — linking free-text task descriptions to conversation sessions — a **top-5 retrieval with a 0.50 floor** balances precision against discovery. Tune by inspecting a few dozen results manually and adjusting.

One subtle concern: text length mismatch. Backlog items are short (10–50 words); session embeddings are mean-pooled from up to 20 chunks. Research from the GDELT Project shows embedding models can score shorter texts as more similar simply because of matching length, and longer texts produce more diffuse vectors. The BGE instruction prefix partially mitigates this. **Using top-K retrieval instead of a hard threshold is more robust** for mixed-length comparisons, since relative ranking is preserved even when absolute scores shift.

---

## No existing tool does automatic embedding-based knowledge-to-task linking

The product landscape breaks into three architectural approaches, and none fully implements what you're building.

**Graph-native tools (Tana, Roam, Anytype)** treat everything as a node in one graph. Tana is the most sophisticated — its Supertag system creates a typed ontology where `#Task` extends `#Meeting` extends a base node type, and AI fields auto-fill properties using LLMs. Roam Research pioneered tasks-in-graph (every `{{[[TODO]]}}` is a block in the graph database), but offers no differentiated visualization for task nodes. Anytype provides a fully local-first, P2P-synced object graph with native Task types and Relations. **Key pattern**: tasks live inline alongside knowledge, maintaining bidirectional links to their creation context.

**Integrated workspace tools (Notion, Huly, Plane)** co-locate tasks and docs without true graph structure. Notion 3.0's AI agents can synthesize across workspace content and auto-create tasks, but rely on relational database views, not a knowledge graph. Third-party tools like IVGraph and Graphify add graph visualization to Notion but remain early-stage. Huly and Plane pair issue tracking with wikis — references between docs and issues are manual, not semantic.

**Enterprise knowledge graphs (Atlassian Rovo/Teamwork Graph)** represent the most mature approach. Rovo's Teamwork Graph connects people, projects, goals, and knowledge across Jira, Confluence, and 50+ apps. It uses **XLM-RoBERTa cross-encoder for entity linking** and embedding-based semantic recall, with personalization signals weighting results by the user's relationship to entities. Rovo Search achieves **78% higher accuracy** than legacy search, and Rovo Chat with graph integration sees **29% higher satisfaction** ratings. This is the closest architectural parallel to what you're building — but it operates at enterprise scale across tools, not within a personal dashboard.

**The academic gap is real.** Extensive literature exists on knowledge-graph-aware recommendation systems (CKE, KMEL, ML-KDGATMoco) and knowledge graphs for construction project management, but **no papers address embedding-based linking of project tasks to personal knowledge bases**. This represents a genuine research opportunity — your system is novel.

---

## UX: split-pane with bidirectional brushing, not mixed-entity graph

The strongest UX pattern for your setup is a **70/30 split-pane layout** — 3D graph on the left, contextual detail panel on the right — with bidirectional highlight synchronization between views. This follows the well-established "brushing and linking" principle from information visualization (Becker & Cleveland, 1987), where selection in one view propagates to all linked views.

**Keep backlog items out of the graph by default.** Adding task nodes to 2,500 session nodes creates visual clutter and cognitive load. Research on heterogeneous graph neural networks (HHGT, 2024) confirms that mixing node types during aggregation "hinders capture of proper correlations" — the same principle applies to human visual perception. Tasks and sessions have fundamentally different connection patterns, and force-directed layouts will oscillate trying to reconcile them. Instead, offer an **optional overlay mode** toggled by the user: when active, linked tasks appear as translucent satellite nodes orbiting their connected sessions, using distinct shapes (cubes for tasks vs. spheres for sessions) and a separate color palette.

**Hover reveals context, click commits to selection.** In the graph, hover triggers lightweight operations — tooltip with node name/type/stats and neighbor highlighting via the library's built-in `highlightNodes` Set pattern. Click triggers heavier operations — populating the side panel, animating the camera to the selected node (using `cameraPosition()` with a **2-second transition**), and triggering the suggestion pipeline. react-force-graph-3d's raycasting handles 2,500 nodes comfortably; throttle hover callbacks to ~60fps and disable pointer interaction during camera animations for optimal performance.

**For the glow effect on highlighted nodes**, use Three.js's `UnrealBloomPass` with selective application:

```javascript
// Set luminanceThreshold high so only emissive nodes bloom
bloomPass.strength = 2;
bloomPass.radius = 0.5;
bloomPass.threshold = 1.0;

// In nodeThreeObject, give highlighted nodes emissive material
if (highlightNodes.has(node.id)) {
  material.emissive = new Color('#ff6b35');
  material.emissiveIntensity = 2.0;
  material.toneMapped = false;  // allows values > 1 to trigger bloom
}
```

**Bidirectional navigation implementation**: clicking a backlog item in the panel highlights all linked session nodes in the graph (color change + size increase + glow), dims unlinked nodes to **opacity 0.1–0.2**, and optionally auto-zooms to the centroid of linked nodes. Clicking a node in the graph scrolls the panel to that node's detail card and shows its related backlog items. Use a shared React state (or Zustand store) for `selectedItem` and `highlightNodes` to keep both views synchronized.

**Auto-suggestions should show 3–5 items inline in the side panel**, not in modals or toasts. Each suggestion displays the session label, similarity percentage, and a brief reason ("shares 3 common topics"). Accept and Dismiss buttons use a simple inline pattern — accepted links persist with `link_type: 'confirmed'`, dismissed ones are recorded to avoid re-suggestion. Show the **top 3 by default** with a "Show 2 more" expander. Use **300–500ms debounce** after selection before computing suggestions, with a skeleton loader in the suggestion area during computation. Research from Baymard Institute confirms that exceeding ~8 suggestions causes choice paralysis; for suggestions requiring cognitive evaluation (not just autocomplete), 3–5 is optimal.

---

## Data model and SQL schema for the link system

The storage architecture uses three tables: `graph_nodes` (synced from graph.json), the existing `backlog_items` (extended with an embedding column), and a new `item_node_links` join table.

```sql
-- Synced copy of graph.json nodes with embeddings
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  summary TEXT,
  project TEXT,
  community_coarse INT,
  community_medium INT,
  community_fine INT,
  embedding vector(1024),
  graph_version TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend existing backlog items
ALTER TABLE backlog_items
  ADD COLUMN embedding vector(1024),
  ADD COLUMN embedded_at TIMESTAMPTZ;

-- Join table with metadata
CREATE TABLE item_node_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL REFERENCES backlog_items(id) ON DELETE CASCADE,
  graph_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'confirmed' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(backlog_item_id, graph_node_id)
);

-- Indexes for fast bidirectional lookup
CREATE INDEX idx_links_backlog ON item_node_links(backlog_item_id);
CREATE INDEX idx_links_node ON item_node_links(graph_node_id);

-- RPC function for similarity search
CREATE FUNCTION match_sessions(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
) RETURNS TABLE (id TEXT, label TEXT, similarity FLOAT)
LANGUAGE sql AS $$
  SELECT id, label,
    1 - (embedding <=> query_embedding) AS similarity
  FROM graph_nodes
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Skip vector indexes entirely.** At 2,500 rows, IVFFlat would produce ~2.5 lists (rows/1000) — too few to function. HNSW works but adds unnecessary build-time overhead. Sequential scan delivers **sub-5ms with 100% recall**. If your graph grows past ~10,000 nodes, revisit with HNSW.

Store `link_type` to distinguish auto-generated suggestions from user-confirmed and manually-created links. This enables filtering the suggestion pipeline to avoid re-suggesting dismissed links, and lets you track which auto-links the user found valuable — a feedback signal for threshold tuning.

---

## Implementation plan and what to defer for v1

**Phase 1 (v1 — build this first):**

- Local batch script (`embed-sync.ts`) that reads graph.json, embeds nodes via Sentence Transformers (ONNX backend), and upserts to Supabase's `graph_nodes` table. Run manually via `npm run embed:sync`.
- Add `embedding` column to `backlog_items`. Embed new items by running the same local script against unembedded rows.
- `match_sessions` RPC function in Supabase for query-time similarity search.
- API route `GET /api/links/suggestions?itemId=xxx` that calls the RPC function.
- Side panel component showing top-3 suggestions when a backlog item is selected, with Accept/Dismiss buttons writing to `item_node_links`.
- Basic bidirectional highlighting: clicking a backlog item highlights linked nodes in graph via shared state; clicking a graph node shows linked backlog items in panel.

**Phase 2 (defer):**

- Offline-first with IndexedDB caching and client-side cosine similarity (the 10MB embedding dataset fits in IndexedDB, but the plumbing is complex)
- File watcher on graph.json for automatic re-sync
- Selective bloom/glow effects (start with simple color change + size increase)
- Task overlay mode in the graph (translucent satellite nodes)
- Community-grouped suggestions ("Job scraper cluster: 3 sessions")
- Feedback loop using accept/dismiss data to tune thresholds
- PowerSync integration for robust offline sync

**Phase 3 (future):**

- Supabase Edge Function with a lightweight cloud embedding model as fallback when local model is unavailable
- Graph-aware task prioritization (tasks connected to more knowledge nodes surface higher)
- Automatic re-linking when graph.json regenerates
- Voice/Telegram input → auto-embed → auto-suggest pipeline

**Data flow for the v1 pipeline:**

```
User creates backlog item (dashboard/Telegram/Claude/voice)
  → Item saved to Supabase (embedding = NULL)
  → Local batch script runs (manually or cron)
    → Embeds unembedded backlog items
    → Stores vectors in backlog_items.embedding
  → User opens backlog item in dashboard
    → GET /api/links/suggestions fires
    → Supabase match_sessions() runs (<5ms)
    → Top-3 suggestions rendered in side panel
  → User accepts/dismisses
    → Server Action writes to item_node_links
    → Graph highlights update via shared state
```

**For the Vercel ↔ local model gap in v1**, accept the tradeoff: new items created via the deployed dashboard won't have embeddings until the next local batch run. This is fine for a personal ops tool — you'll typically be at your Mac when working on the dashboard. If instant embedding matters, run a lightweight FastAPI server locally (`POST /embed` → returns vector) and call it from `localhost` during development.

**Performance budget for the full interaction loop**: embedding a new backlog item takes ~30ms locally, the pgvector similarity query takes <5ms, and React Query returns cached suggestions instantly on re-visits. The user-facing latency from "click backlog item" to "see suggestions" should be **under 50ms** for items with pre-computed embeddings, or **under 100ms** if embedding happens on-demand via a local API server. Camera animation to highlighted nodes adds a deliberate 2-second transition that masks any computation latency.

---

## Conclusion

The architecture is simpler than it appears. pgvector's brute-force scan eliminates indexing complexity at your scale. The batch-local embedding pattern sidesteps the Vercel/local model impedance mismatch cleanly. And the brushing-and-linking UX paradigm — borrowed from decades of information visualization research — provides a proven interaction model for bidirectional graph↔list navigation.

Three insights emerged from this research that may not be obvious. First, **you're building in a genuine product gap** — even Atlassian's $50B+ enterprise with Rovo doesn't do automatic embedding-based task-to-knowledge linking; their entity linking uses cross-encoders for named entities, not semantic similarity for free-text tasks. Second, **the BGE instruction prefix is essential for short-to-long matching** — without it, your backlog items will systematically produce weaker similarity scores against mean-pooled session embeddings due to length mismatch effects. Third, **resist the urge to put tasks in the graph** — heterogeneous node types degrade both force-layout stability and human pattern recognition; the overlay-on-demand approach preserves the graph's analytical value while still enabling visual cross-referencing when needed.