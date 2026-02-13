# Phase 7: Search & Drill-down

> [Back to main plan](../README.md)

## Goal

Full-text search into the 245K chunks from the dashboard. Click a graph node → see actual conversation content. Search across all sessions.

## Tools

- **Code:** Opus — daemon endpoints, Next.js pages, search overlay component
- **DB:** Existing Zikaron sqlite-vec DB with FTS5 (no Turso needed)

## Decision: Use Existing Zikaron DB

**Chose:** Use the existing Zikaron daemon's sqlite DB with its pre-built FTS5 index.
- 245K chunks already indexed in `chunks_fts` table
- FTS5 search returns results in <100ms
- No need for Turso, edge DB, or sync pipeline — the daemon IS the search engine
- Same `/api/*` → daemon proxy pattern as all other dashboard endpoints

## What Was Built

### Daemon Endpoints (daemon.py)
- `GET /dashboard/search?q=...&project=...&type=...&limit=N` — FTS5 text search
  - Multi-word queries split into AND terms
  - Returns ranked results with `snippet()` highlighting (`<mark>` tags)
  - Partial project matching (LIKE `%golems%`)
  - Content type filtering
- `GET /session/{session_id}?page=N&per_page=N` — Session detail
  - Chunks paginated with content, type, importance, tags, summary
  - Files touched (distinct source_files)
  - Content type distribution
  - Session context (branch, PR, plan, phase) if available
  - Handles both conversation_id and ID prefix matching (for newer chunks)

### Search Overlay (Cmd+K)
- Global `SearchOverlay` component in layout — opens on `⌘K` / `Ctrl+K`
- Command-palette style with debounced input (200ms)
- Results show FTS5 snippets with highlighted matches
- Type icons and colors (code, messages, files, diffs, errors)
- Keyboard navigation (↑↓ arrows, Enter to open, Esc to close)
- Click result → session detail page
- Brain icon → view in Brain View with node pre-selected
- Search button in TopBar and sidebar

### Session Detail Page (/session?id=...)
- Full session viewer with paginated conversation chunks
- Content type filter pills (click to filter by type)
- Session context panel (project, branch, PR, plan, phase)
- Collapsible files list
- Color-coded chunks by type (left border colors)
- Metadata per chunk (importance, intent, summary)

### Graph Integration
- Node panel "View Session Detail" button → links to session page
- Brain View accepts `?node=` query param for pre-selecting a node
- Search results "View in Brain" icon → navigates to Brain View
- Bidirectional: search → graph node, graph node → session detail

## Status

- [x] Choose edge DB (use existing Zikaron DB — no Turso needed)
- [x] FTS5 already indexed — no setup needed
- [x] No sync pipeline needed — daemon queries DB directly
- [x] Search API route (`/dashboard/search`)
- [x] Session detail API route (`/session/{id}`)
- [x] Search UI (Cmd+K overlay)
- [x] Session detail panel (paginated, filterable)
- [x] Graph↔search integration (bidirectional navigation)
