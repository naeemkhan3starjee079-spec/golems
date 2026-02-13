# Phase 6: Backlog & Project Manager

> [Back to main plan](../README.md)

## Goal

Linear-style project management board built into the dashboard. Manage all projects, add ideas fast (voice/text/Telegram/Claude), share specific projects with friends. Backlog items link to Brain View clusters for knowledge traceability.

## Key Features

### Board View
- Kanban columns: Backlog | In Progress | Done | Archived
- Quick add: type/voice → item appears instantly
- Drag-and-drop between columns
- Filter by project, priority, tag, assignee

### Multi-Project Management
- Each project is a board (Golems, Songscript, Domica, Taba, etc.)
- Invite friends/collaborators to specific projects (not everything)
- Per-project permissions: viewer, editor, admin

### Quick Input Methods
- **Dashboard:** inline text input at top of board
- **Telegram:** `/backlog add [project] [idea]` → creates item
- **Claude:** any Claude session can add via skill/MCP
- **Voice:** record voice note → transcription → item (future)

### Brain Graph Integration
- Each backlog item can link to brain graph clusters/sessions
- Click backlog item → Brain View highlights related knowledge nodes
- Click brain cluster → side panel shows related backlog items
- Auto-suggest: "This cluster relates to backlog items X, Y, Z" based on embedding similarity
- Traceability: see which sessions contributed to which project decisions

### Data Model (Supabase)
```sql
-- Backlog items
backlog_items (
  id uuid PK,
  project text NOT NULL DEFAULT 'golems',
  title text NOT NULL,
  description text,
  status text DEFAULT 'backlog', -- backlog | in_progress | done | archived
  priority text DEFAULT 'medium', -- low | medium | high | urgent
  tags text[],
  created_by text DEFAULT 'dashboard',
  created_at timestamptz,
  updated_at timestamptz (auto-trigger)
)
```

## Steps

1. Research best kanban UX (Linear, Plane, Huly) — what to steal
2. Create Supabase migration for backlog tables + RLS
3. Build backlog API routes (CRUD + sharing)
4. Build board UI component (Kanban view)
5. Add quick-add input (keyboard shortcut)
6. Build brain graph linking (embedding similarity)
7. Add Telegram integration (`/backlog` command)
8. Add Claude skill (`/backlog` or MCP tool)

## Depends On

- Phase 3 (Frontend Shell) — needs the app to exist
- Phase 4 (Brain View) — for graph linking
- Phase 8 (Multi-tenant) — for sharing/permissions

## Status

- [x] Supabase migration for backlog tables (with RLS, updated_at trigger)
- [x] Backlog CRUD API (GET/POST/PATCH/DELETE via daemon → Supabase)
- [x] Kanban board UI (4 columns, quick-add, project filter, priority badges)
- [x] Quick-add input (Enter to submit, project/priority selectors)
- [ ] Brain graph linking (deferred — needs embedding similarity)
- [ ] Telegram integration (deferred — needs `/backlog` command)
- [ ] Claude skill/MCP (deferred — needs MCP tool)
- [ ] Drag-and-drop (deferred — needs dnd-kit library)

## What Was Built

### Supabase Migration
- `backlog_items` table with status/priority CHECK constraints
- Indexes on status, project, priority
- RLS enabled with service_role policy
- Auto-updating `updated_at` trigger

### Daemon API (packages/zikaron/src/zikaron/daemon.py)
- `GET /backlog/items?project=X&status=Y` — list with optional filters
- `POST /backlog/items` — create with title, project, priority, tags
- `PATCH /backlog/items/:id` — update status, title, description, priority, tags
- `DELETE /backlog/items/:id` — remove item
- Shared `_supabase_mutate()` helper for POST/PATCH/DELETE

### Kanban Board (packages/dashboard/src/app/backlog/page.tsx)
- 4-column Kanban: Backlog, In Progress, Done, Archived
- Quick-add bar with project/priority selectors + Enter key
- Arrow button to advance items to next status
- Delete button on hover
- Project filter dropdown
- Priority badges (urgent=rose, high=amber, medium=accent, low=muted)
- Optimistic UI updates (instant visual feedback, revert on error)
- Refresh button
