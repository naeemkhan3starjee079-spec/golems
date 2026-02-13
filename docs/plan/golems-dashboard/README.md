# Golems Dashboard — Single Pane of Glass

> Multi-tenant personal ops dashboard on etanheyman.com. Live service health, token tracking, Brain View knowledge graph. Each golems user gets their own.

**Status:** Phases 1-6 Done — Phase 7 (Search & Drill-down) next

---

## Vision

One dashboard at etanheyman.com that shows:
- **Brain View** — interactive 3D knowledge graph (star-system / neural network aesthetic)
- **Ops Dashboard** — live service health (Telegram, Railway, Ollama, launchd)
- **Token Tracker** — CC usage, Haiku API costs, GLM local usage (in/out, per-project)
- **Enrichment Stats** — Zikaron enrichment progress, session counts, chunk growth
- **Backlog / Project Manager** — Linear-style board for all projects. Quick add (voice/text/Telegram/Claude). Share specific projects with friends/collaborators.
- **Multi-tenant** — auth via Supabase, data scoped per user. Deploy once, everyone gets their own. Per-project access sharing.

## Tech Stack (from research consensus)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Graph rendering** | react-force-graph-3d (Three.js) | 3D, bloom, particles, 500-5K nodes, React native |
| **2D fallback** | Sigma.js + Graphology | 50K+ nodes for overview mode |
| **Frontend** | Next.js 14+ (App Router) | SSR, API routes, Vercel deploy |
| **Styling** | Tailwind CSS | Dark theme, responsive |
| **Auth** | Supabase Auth | Multi-tenant, per-user data |
| **Database** | Supabase (cloud data) + Turso (edge search) | Service events + fast chunk search |
| **Aggregation** | Python (graspologic, UMAP, HDBSCAN) | Leiden community detection, layout |
| **Graph data** | Static graph.json (pre-generated) | Instant load, no backend needed |
| **Hosting** | Vercel (free tier) | CDN, edge functions, zero-config |

## Research

| Source | File | Status |
|--------|------|--------|
| Cursor #1 | `research-cursor-obsidian-enrichment.md` | Done — Obsidian enrichment plan |
| Cursor #2 | `research-cursor-brain-view-architecture.md` | Done — Web architecture comparison |
| Claude Web | `compass_artifact_wf-*.md` | Done — Comprehensive tech analysis |
| Gemini Deep | `AI Coding Assistant Knowledge Graph Visualization.txt` | Done — Deep technical framework |
| Gemini Fast | `Interactive Graph Visualizations & Projects.txt` | Done — 10 real examples + open source |

### Key Research Findings

1. **Aggregation is harder than visualization** — Leiden community detection on hybrid similarity (40% semantic + 35% file overlap + 15% temporal + 10% branch) produces best clusters
2. **react-force-graph-3d** is the clear winner for 3D neural-network aesthetic (bloom, particles, fly-to)
3. **Pre-computed layouts** beat real-time force simulation for presentation-ready views
4. **Hybrid deploy** (static graph.json + edge DB for search) = fast + cheap + no backend
5. **Semantic zoom** with 3-5 levels is the key UX pattern (not just geometric zoom)
6. **Dark theme** with bloom + particles = "star map" aesthetic (#0A0E1A background, cyan/purple/emerald nodes)

---

## Phases

| # | Phase | Branch | Status |
|---|-------|--------|--------|
| 1 | [Aggregation Pipeline](phase-1-aggregation-pipeline/README.md) | `feature/dashboard-phase1` | Done (PR #143) |
| 2 | [API Layer](phase-2-api-layer/README.md) | `feature/dashboard-phase2` | Done (PR #145) |
| 3 | [Frontend Shell](phase-3-frontend-shell/README.md) | `feature/dashboard-phase3` | Done (PR #146) |
| 4 | [Brain View](phase-4-brain-view/README.md) | `feature/dashboard-phase4` | Done |
| 5 | [Ops Dashboard](phase-5-ops-dashboard/README.md) | `feature/dashboard-phase5` | Done |
| 6 | [Backlog & Project Manager](phase-6-backlog/README.md) | `feature/dashboard-phase6` | Done |
| 7 | [Search & Drill-down](phase-7-search-drilldown/README.md) | `feature/dashboard-phase7` | Pending |
| 8 | [Multi-tenant](phase-8-multi-tenant/README.md) | `feature/dashboard-phase8` | Pending |
| 9 | [Deploy & Polish](phase-9-deploy-polish/README.md) | `feature/dashboard-phase9` | Pending |

---

## Future Ideas (post-v1)

- **Voice-activated customer setup assistant** — real-time voice agent that digs deep with structured questions (like Taba UX questionnaire), searches web, builds project spec collaboratively. Hebrew+English. Works on phone during customer meetings. See Taba files for inspiration: `שאלות לסיווג חוות דעת.md`, `שאלות UX לאדריכל.md`
- **Uptime Kuma integration** — free alerting for Railway hobby tier

---

## Execution Rules

1. **Sequential** — phases in order, no skipping
2. **One branch per phase** — `master → feature/dashboard-phaseN → PR → merge`
3. **Research first** — each phase specifies which CLI helper does research vs code
4. **CodeRabbit + bot review** before merge
5. **Notify on Telegram** when PR is ready
