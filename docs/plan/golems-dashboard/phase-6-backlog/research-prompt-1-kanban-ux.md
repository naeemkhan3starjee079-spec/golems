# Research Prompt 1: Kanban/Backlog UX for Developer Dashboard

> Paste this into Claude Web (or Gemini Deep Research) for comprehensive UX research

---

## Context

I'm building a personal ops dashboard (Next.js 14, Tailwind, Supabase, dark theme) at etanheyman.com. One major feature is a **Backlog / Project Manager** — a Linear-style board where I can manage ideas and tasks across ALL my projects (I have ~6 active software projects).

This is NOT a team product. It's a personal tool where:
- **I** add items quickly (typing, voice, Telegram bot, AI agent)
- **I** share specific projects with friends/collaborators (viewer/editor access)
- Items flow: Backlog → In Progress → Done → Archived
- The board lives alongside a 3D knowledge graph (Brain View) and ops dashboard

## What I Love About Linear

- Keyboard-first (Cmd+K for everything)
- Instant feel — no loading, optimistic updates
- Clean dark theme
- Quick add: just start typing
- Filters that don't suck
- Cycles/sprints without being heavy

## What I Need Researched

### 1. UX Patterns to Steal
Compare the following and tell me what's worth copying:
- **Linear** — the gold standard. What specific interactions make it feel fast?
- **Plane.so** — open-source Linear alternative. What's their architecture?
- **Huly** — newer open-source PM. What do they do differently?
- **Height** — AI-native PM. How do they integrate AI into the workflow?
- **Todoist** — quick capture. How do they make adding items effortless?

For each, I want:
- Key UX patterns (keyboard shortcuts, transitions, animations)
- Data model (how do they structure projects/items/views?)
- What makes them feel "fast" (optimistic updates? local-first? CRDT?)

### 2. Kanban Board Implementation
- Best React kanban libraries in 2026 (dnd-kit vs @hello-pangea/dnd vs custom)
- How to make drag-and-drop feel smooth in Next.js App Router
- Virtual scrolling for boards with 100+ items
- Real-time collaboration (Supabase Realtime vs custom WebSocket)

### 3. Quick Add / Capture UX
- How should the quick-add input work? (global keyboard shortcut? floating input? inline?)
- Natural language parsing: "urgent: fix auth bug in golems" → {priority: urgent, project: golems, title: "fix auth bug"}
- Voice input on web: Web Speech API vs Deepgram vs Whisper
- Telegram integration patterns: how to bridge chat → board items

### 4. Multi-Project Views
- How to show multiple projects in one view without it being overwhelming
- Filtering UX: tags, projects, priority, date ranges
- "Everything" view vs per-project boards

### 5. Dark Theme Kanban Specifics
- Color systems for card priority/status in dark mode
- How to make cards scannable at a glance
- Animations that feel premium (Framer Motion patterns)

## Constraints
- Next.js 14 App Router (RSC + client components)
- Supabase for auth + DB (PostgreSQL)
- Tailwind CSS + shadcn/ui components
- Must work great on desktop (large monitor), acceptable on tablet
- Dark theme only (matches the rest of the dashboard)
- I'm one developer — keep it simple, no over-engineering

## Deliverable
Give me a concrete implementation plan with:
1. Recommended libraries/tools
2. Data model (Supabase tables)
3. Key UX interactions to implement first
4. What to skip / defer
5. Code architecture (which components, how they connect)
