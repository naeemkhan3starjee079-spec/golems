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
  user_id uuid FK → auth.users,
  project text NOT NULL,         -- 'golems', 'songscript', etc.
  title text NOT NULL,
  description text,
  status text DEFAULT 'backlog', -- backlog | in_progress | done | archived
  priority text DEFAULT 'medium', -- low | medium | high | urgent
  tags text[],                   -- free-form tags
  brain_clusters int[],          -- linked brain graph community IDs
  brain_sessions text[],         -- linked session IDs
  created_at timestamptz,
  updated_at timestamptz,
  created_by text               -- 'dashboard' | 'telegram' | 'claude' | 'voice'
)

-- Project sharing
backlog_projects (
  id uuid PK,
  owner_id uuid FK → auth.users,
  name text NOT NULL,
  description text,
  shared_with jsonb DEFAULT '[]' -- [{user_id, role: 'viewer'|'editor'}]
)
```

## Research Needed

- **Best kanban board UX patterns for developers** — what makes Linear feel so good?
- **Voice-to-backlog pipeline** — Whisper/Deepgram → structured item
- **Embedding-based linking** — how to match backlog text to brain graph clusters efficiently

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

- [ ] Research kanban UX patterns
- [ ] Supabase migration for backlog tables
- [ ] Backlog CRUD API
- [ ] Kanban board UI
- [ ] Quick-add input
- [ ] Brain graph linking
- [ ] Telegram integration
- [ ] Claude skill/MCP
