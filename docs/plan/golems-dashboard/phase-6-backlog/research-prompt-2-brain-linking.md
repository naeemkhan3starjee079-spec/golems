# Research Prompt 2: Backlog ↔ Brain Graph Knowledge Linking

> Paste this into Claude Web (or Gemini Deep Research) for comprehensive technical research

---

## Context

I have two features in my personal ops dashboard:

### Feature A: Brain View (3D Knowledge Graph)
- **2,500 nodes** — each is a Claude Code conversation session
- **~6,000 edges** — based on embedding similarity (cosine on bge-large-en-v1.5, 1024 dims)
- **Leiden communities** — hierarchical clustering at 3 levels (coarse ~5, medium ~20, fine ~100s)
- **UMAP 3D layout** — pre-computed coordinates
- **Rendered with** react-force-graph-3d (Three.js)
- Each node has: project, branch, content types, intents, importance score, chunk count
- Stored as static `graph.json` (~2MB), regenerated periodically

### Feature B: Backlog / Project Manager
- Linear-style kanban board
- Items have: title, description, project, priority, tags, status
- Stored in Supabase (PostgreSQL)
- Items added via: dashboard, Telegram, Claude agent, voice

### The Link
I want backlog items to be **linked to brain graph clusters/sessions** so humans can:
1. Click a backlog item → Brain View highlights related knowledge (sessions, clusters)
2. Click a brain cluster → side panel shows related backlog items
3. Auto-suggest: "This session cluster relates to backlog items X, Y, Z"
4. Trace decisions: "Why did we decide X?" → linked sessions show the conversation

## What I Need Researched

### 1. Embedding-Based Linking
- How to match free-text backlog items to pre-computed session embeddings?
- Should I embed backlog items with the same model (bge-large-en-v1.5)?
- Nearest-neighbor search: compute at write time or query time?
- Threshold for "related" — how similar is similar enough?
- Should links be auto-generated, manual, or both?

### 2. Knowledge Graph ↔ Task Management Integration Patterns
Research existing products/papers that link knowledge graphs to project management:
- **Notion** — does their knowledge graph (2025 launch) link to projects?
- **Roam/Obsidian** — how do task plugins interact with the graph view?
- **Academic**: any papers on "linking project tasks to knowledge bases"?
- **Atlassian Intelligence** — Jira + Confluence knowledge linking

### 3. UX for Cross-Feature Linking
- How should the "related items" panel look in a 3D graph context?
- Hover vs click to show connections
- Visual encoding: how to highlight linked nodes in the brain view when a backlog item is selected?
- Bidirectional: brain → backlog AND backlog → brain
- Should backlog items appear AS nodes in the brain graph? Or stay separate?

### 4. Technical Architecture
- Where to store the links? (Supabase join table? Embedded in graph.json?)
- Real-time vs batch: compute links when item is created, or periodically?
- Performance: matching 1 item against 2500 embeddings — fast enough for real-time?
- Should the dashboard fetch embeddings client-side or use an API?

### 5. Auto-Suggestion Pipeline
When I create a backlog item "Improve job scraping matching algorithm":
1. Embed the title+description with bge-large-en-v1.5
2. Find top-K similar session nodes from brain graph
3. Show: "Related sessions: Job scraper optimization (3 sessions), RecruiterGolem matching (2 sessions)"
4. I confirm/reject the links

How to make this feel fast and useful, not annoying?

## Actual graph.json Sample (what the data looks like)

```json
{
  "meta": {
    "generated_at": "2026-02-13T01:12:30Z",
    "session_count": 2509,
    "node_count": 2509,
    "edge_count": 5975,
    "community_counts": { "coarse": 4, "medium": 4, "fine": 2489 }
  },
  "nodes": [
    {
      "id": "3cceab66",
      "session_id": "3cceab66-9c27-44a5-890a-32e5e4754a56",
      "label": "prd / desktop gits / desktop",
      "community": { "coarse": 0, "medium": 0, "fine": 4 },
      "x": 45.74, "y": -29.24, "z": 17.23,
      "size": 4.25,
      "color_type": "reviewing",
      "project": "claude-golem",
      "branch": "",
      "plan": "",
      "chunk_count": 17799,
      "files_count": 0,
      "started_at": "",
      "importance": 6.5
    }
  ],
  "edges": [
    { "source": "3cceab66", "target": "1ead880d", "weight": 0.393 }
  ]
}
```

Each node = one Claude Code conversation. Embeddings are bge-large-en-v1.5 (1024 dims), mean-pooled from up to 20 sampled chunk embeddings per session.

## Constraints
- Next.js 14 App Router
- Supabase (PostgreSQL + pgvector extension available)
- bge-large-en-v1.5 embeddings (1024 dims) — model runs locally on Mac, not in cloud
- Brain graph is pre-computed (graph.json), not a live database
- Must work offline-first (embedding can happen server-side later)
- Dark theme, react-force-graph-3d for visualization

## Deliverable
Give me:
1. Recommended linking architecture (embed at write time vs query time)
2. Data model for the links
3. UX mockup description for the cross-linking interactions
4. Technical implementation plan (which APIs, where embeddings live)
5. What to skip / defer for v1
6. Real examples of products/papers that do this well
