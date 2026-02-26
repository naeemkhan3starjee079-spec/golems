# Building a Linear-grade personal project manager

**The fastest path to a premium personal kanban**: use `dnd-kit` for drag-and-drop, `cmdk` for the command palette, `Zustand` + `TanStack Query` for state, fractional indexing for ordering, and Supabase Realtime for collaboration — all wrapped in a dark-theme system built on your existing `#0A0E1A` base. Linear's core secret isn't complex technology but rather **optimistic local-first writes** combined with single-key keyboard shortcuts. You can replicate 80% of that feel with a fraction of the architecture. This report covers every layer from database schema to animation code.

---

## What makes Linear feel instant — and what to steal

Linear's performance comes from their **Sync Engine**: all workspace data lives in IndexedDB on the client, meaning searches and filters operate on in-memory JavaScript arrays at **0ms latency**. Every write goes to local state first, updates the UI immediately, then syncs asynchronously to the server. They use Last-Write-Wins (not CRDTs) for conflict resolution — CRDTs only appear in rich-text document editing. For a personal tool, this means you don't need a sync engine at all. **Optimistic updates with TanStack Query** give you the same perceived speed with a fraction of the complexity.

Linear's **99 keyboard shortcuts** follow a learnable grammar. Single keys perform actions on focused items: `c` creates, `s` changes status, `p` sets priority, `l` adds a label. Navigation uses vim-style `j/k` and a go-to pattern (`g+i` for inbox, `g+b` for backlog). The `Cmd+K` command palette — powered by the same `cmdk` library you'd use — serves as the universal action entry point. The takeaway: **keyboard shortcuts aren't a feature, they're the architecture**. Build the command palette first, wire shortcuts second, and the app feels 10x faster than any mouse-driven alternative.

From **Todoist**, the killer pattern is natural language parsing in a single input field. Typing `fix auth bug p1 @golems tomorrow` sets priority, project, and due date with zero mode switching. Todoist highlights recognized tokens in real-time as you type. From **Height** (shutting down September 2025 but worth studying), the useful AI pattern is **auto-fill from title**: type a task name, and an LLM suggests priority, labels, and project. The gimmicky AI features — autonomous spec updates, auto-status reports — add complexity without proportional value for a solo developer. **Plane.so** recently migrated from Next.js to React Router + Vite, validating that heavy SSR isn't necessary for a PM tool. Their open-source codebase at `makeplane/plane` is worth studying for API design and issue management patterns. **Huly** takes the all-in-one approach (tasks + chat + docs + calendar) using Svelte and MongoDB — novel architecture but not directly applicable to your Next.js stack.

---

## The recommended library stack

Every library here was chosen for a solo developer building on Next.js 14 + Supabase + Tailwind + shadcn/ui. The goal: maximum UX quality with minimum maintenance burden.

| Layer | Library | Why |
|---|---|---|
| Drag-and-drop | **dnd-kit v6** (`@dnd-kit/core` + `@dnd-kit/sortable`) | ~13kB, best kanban ecosystem, shadcn/ui sortable component exists, excellent accessibility. Pragmatic-drag-and-drop is smaller (4.7kB) but has weaker docs. |
| Command palette | **cmdk** (used by Linear itself) | Headless, shadcn/ui ships a pre-built Command component on top of it. Fuzzy search built in. |
| Server state | **TanStack Query v5** | Caching, optimistic updates, background refetch, `initialData` hydration from Server Components. The canonical Supabase client-side state solution. |
| UI state | **Zustand** | ~3kB, natural fit for interconnected board state (drag state, sidebar, modals, undo stack). Selectors prevent unnecessary re-renders. |
| Item ordering | **fractional-indexing** | 1.17M weekly npm downloads. One DB row update per drag instead of O(n) with integer positions. |
| Date parsing | **chrono-node** | Gold standard for JS natural language dates. Handles "tomorrow", "next Friday", "in 2 weeks". |
| Animations | **Framer Motion** (now "Motion") | Layout animations for card repositioning, `AnimatePresence` for enter/exit, spring physics for drag feel. |
| Telegram bot | **grammY** | TypeScript-first, excellent webhook support, runs on Supabase Edge Functions (Deno). |
| Voice (web) | **Web Speech API** | Free, zero-latency streaming in Chrome. No external dependency needed for personal use. |
| Voice (server) | **OpenAI Whisper API** | $0.006/min for Telegram voice messages. Negligible cost for personal use. |
| Real-time | **Supabase Realtime** | Postgres Changes for board sync, Presence for who's online. Supports 200 concurrent users per channel — far exceeding personal tool needs. |

Skip virtual scrolling entirely. A personal kanban rarely exceeds 30 items per column, and adding `@tanstack/react-virtual` creates painful interactions with drag-and-drop (disappearing items, transform conflicts). Add it later if you ever consistently hit 200+ items per column.

---

## Supabase database schema

The schema uses PostgreSQL enums for type safety, fractional indexing via TEXT position columns, and RLS policies that support both owner access and project-level sharing with viewer/editor roles.

```sql
-- Core enums
CREATE TYPE item_status AS ENUM ('backlog', 'todo', 'in_progress', 'done', 'archived');
CREATE TYPE item_priority AS ENUM ('none', 'low', 'medium', 'high', 'urgent');
CREATE TYPE item_source AS ENUM ('web', 'telegram', 'voice', 'ai_agent', 'api');
CREATE TYPE share_role AS ENUM ('viewer', 'editor');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- Profiles (extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects (~6 active)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'folder',
  status project_status NOT NULL DEFAULT 'active',
  sort_order TEXT NOT NULL DEFAULT 'a0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items (the core entity)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status item_status NOT NULL DEFAULT 'backlog',
  priority item_priority NOT NULL DEFAULT 'none',
  position TEXT NOT NULL DEFAULT 'a0',
  source item_source NOT NULL DEFAULT 'web',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

-- Many-to-many: items ↔ tags
CREATE TABLE public.item_tags (
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Saved views (filter/sort configurations)
CREATE TABLE public.views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'filter',
  filters JSONB NOT NULL DEFAULT '{}',
  sort_by TEXT DEFAULT 'position',
  sort_direction TEXT DEFAULT 'asc',
  group_by TEXT,
  view_type TEXT DEFAULT 'board',
  is_default BOOLEAN DEFAULT false,
  sort_order TEXT NOT NULL DEFAULT 'a0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project sharing
CREATE TABLE public.project_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role share_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, shared_with)
);
```

**Key indexes** for the queries you'll run most:

```sql
CREATE INDEX idx_items_owner_status ON public.items(owner_id, status);
CREATE INDEX idx_items_project_status ON public.items(project_id, status);
CREATE INDEX idx_items_position ON public.items(status, position);
CREATE INDEX idx_items_due_date ON public.items(owner_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_shares_shared_with ON public.project_shares(shared_with);
```

**RLS policies** use two helper functions for clean sharing logic:

```sql
CREATE OR REPLACE FUNCTION public.has_project_access(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND owner_id = p_user_id
    UNION ALL
    SELECT 1 FROM public.project_shares WHERE project_id = p_project_id AND shared_with = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Owner full access to all their items
CREATE POLICY "Owners full access" ON public.items
  FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()));

-- Shared users can view items in shared projects
CREATE POLICY "Shared viewers read" ON public.items
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.has_project_access(project_id, (SELECT auth.uid())));
```

**Fractional indexing** is why the `position` column is `TEXT` rather than `INTEGER`. When you drag a card between two others, you generate a single string key that sorts lexicographically between them — **one row update instead of renumbering the entire column**:

```typescript
import { generateKeyBetween } from 'fractional-indexing';

// Card dropped between positions 'a0' and 'a1'
const newPosition = generateKeyBetween('a0', 'a1'); // → 'a0V'

// Card dropped at the end
const endPosition = generateKeyBetween('a2', null); // → 'a3'
```

---

## Code architecture and component boundaries

The critical architectural decision is where to draw the **Server Component / Client Component boundary**. Server Components fetch initial data from Supabase; the Client Component boundary lives at the `KanbanBoard` level, wrapping everything that needs drag-and-drop, state, and real-time subscriptions.

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Server: session check, sidebar shell
│   │   ├── page.tsx                ← Server: "Everything" view, fetches items
│   │   ├── board/page.tsx          ← Server: fetches items → passes to BoardView
│   │   │   └── _components/
│   │   │       ├── board-view.tsx  ← 'use client': DnD context, Zustand, Realtime
│   │   │       ├── column.tsx      ← 'use client': droppable zone
│   │   │       └── item-card.tsx   ← 'use client': draggable card
│   │   ├── projects/[id]/page.tsx  ← Server: project detail
│   │   └── _components/
│   │       ├── sidebar.tsx         ← 'use client': navigation
│   │       └── command-palette.tsx ← 'use client': Cmd+K
│   └── api/
│       ├── items/route.ts          ← POST: external item creation (Telegram, AI, API)
│       └── telegram/webhook/route.ts
├── hooks/
│   ├── use-items.ts                ← TanStack Query hooks
│   ├── use-realtime.ts             ← Supabase Realtime → query invalidation
│   └── use-keyboard-shortcuts.ts
├── stores/
│   ├── board-store.ts              ← Zustand: drag state, selected items
│   └── ui-store.ts                 ← Zustand: sidebar, modals, command palette
└── lib/
    ├── supabase/client.ts          ← Browser client (singleton)
    ├── supabase/server.ts          ← Server client (cookies)
    ├── supabase/admin.ts           ← Service role (API routes)
    └── parse-task.ts               ← NLP parsing (regex + chrono-node)
```

The **data flow** pattern: Server Component fetches from Supabase → passes `initialData` to Client Component → TanStack Query hydrates cache with `initialData` → Zustand manages ephemeral UI state (drag, selection) → Supabase Realtime triggers `queryClient.invalidateQueries` on remote changes → optimistic updates handle local mutations instantly.

The **optimistic drag-and-drop** pattern is the most important code to get right:

```typescript
// useMoveItem hook
export function useMoveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, newStatus, beforePos, afterPos }) => {
      const position = generateKeyBetween(beforePos, afterPos);
      await supabase.from('items')
        .update({ status: newStatus, position })
        .eq('id', itemId).throwOnError();
    },
    onMutate: async ({ itemId, newStatus, beforePos, afterPos }) => {
      await queryClient.cancelQueries({ queryKey: ['items'] });
      const previous = queryClient.getQueryData(['items']);
      queryClient.setQueryData(['items'], (old) =>
        old.map(item => item.id === itemId
          ? { ...item, status: newStatus, position: generateKeyBetween(beforePos, afterPos) }
          : item
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['items'], context?.previous); // rollback
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
}
```

---

## Quick capture: the input pipeline that makes everything flow

The capture system uses three layers: a **command palette** (`Cmd+K`) as the universal entry point, **inline quick-add** (`N` key) for rapid fire within a column, and a **natural language parser** that extracts structure from plain text.

The parser follows Todoist's proven syntax while staying simple enough to implement with regex + chrono-node:

```typescript
import * as chrono from 'chrono-node';

function parseTaskInput(input: string) {
  let result = { title: input, priority: null, project: null, tags: [], due: null };

  // Priority: p1-p4 or "urgent"
  const pMatch = input.match(/\bp([1-4])\b/i);
  if (pMatch) { result.priority = parseInt(pMatch[1]); input = input.replace(pMatch[0], ''); }

  // Project: @project
  const projMatch = input.match(/@(\w+)/);
  if (projMatch) { result.project = projMatch[1]; input = input.replace(projMatch[0], ''); }

  // Tags: #tag
  for (const m of input.matchAll(/#(\w+)/g)) { result.tags.push(m[1]); input = input.replace(m[0], ''); }

  // Dates: chrono-node handles "tomorrow", "next Friday", "in 2 weeks"
  const dateResult = chrono.parse(input);
  if (dateResult.length) { result.due = dateResult[0].start.date(); input = input.replace(dateResult[0].text, ''); }

  result.title = input.trim();
  return result;
}

// "fix auth bug p1 @golems tomorrow" →
// { title: "fix auth bug", priority: 1, project: "golems", tags: [], due: Date(tomorrow) }
```

Show parsed tokens highlighted inline as the user types — this is what makes Todoist's input feel magical. Use colored inline chips: cyan for dates, purple for projects, orange for priority.

For **Telegram integration**, a grammY bot on a Supabase Edge Function receives messages and hits the same `/api/items` endpoint. Plain text messages auto-create backlog items; `/add`, `/list`, and `/done` commands provide structured interaction. Voice messages download the OGG file, transcribe via Whisper API ($0.006/min), run through the same `parseTaskInput`, and create items. The **AI agent** ("golem") integration is identical: a `POST /api/items` with an API key header and a `source: "ai_agent"` field.

For **voice on web**, the Web Speech API is free and instant in Chrome — perfectly adequate for a personal tool where you control the browser. Wrap it in a `useVoiceInput` hook that feeds transcription results into the task parser.

---

## Dark theme design system for your #0A0E1A base

Your `#0A0E1A` background is darker than Material Design's standard `#121212`, which creates a premium feel but demands careful contrast management. The key principle in dark mode: **elevation equals lightness** (the opposite of light mode, where elevation means darker shadows).

**Surface hierarchy** — each layer is 5–8% lighter than the one below:

| Layer | Hex | Usage |
|---|---|---|
| Base | `#0A0E1A` | Page background |
| Surface 1 | `#111627` | Column backgrounds, sidebar |
| Surface 2 | `#161B2E` | Card backgrounds |
| Elevated | `#1C2240` | Hover states, dropdowns |
| Overlay | `#232A4A` | Modals, active selections |

All grays carry a subtle **blue tint** (matching the 220° hue of your base) for visual cohesion. Never use pure neutral grays — they'll look muddy against the blue-black.

**Priority colors** use desaturated variants to avoid vibration on dark backgrounds. Apply them as a **3px left border** on cards — visible at a glance without overwhelming the layout:

| Priority | Border color | Background tint |
|---|---|---|
| Urgent | `#EF4444` | `rgba(239,68,68,0.10)` |
| High | `#F97316` | `rgba(249,115,22,0.10)` |
| Medium | `#EAB308` | `rgba(234,179,8,0.08)` |
| Low | `#3B82F6` | `rgba(59,130,246,0.10)` |

**Status colors** map to your existing accent palette: Backlog is `#64748B` (gray), In Progress is `#22D3EE` (your cyan accent), Done is `#34D399` (your emerald accent). Use Linear's geometric icon progression — empty circle (○) for backlog through filled circle (●) for done — so status is scannable without reading text.

**Card design**: 14px medium-weight title in `#F1F5F9`, 11px metadata in `#64748B`, colored tag pills at 10% opacity backgrounds. Target **72–80px card height** for maximum density while maintaining readability. Show only: title, status icon, priority border, 1–2 tags, due date if set. Skip assignee (it's always you) and estimates for V1.

**Framer Motion animations** that feel premium without being distracting:

```tsx
// Card drag lift effect
<motion.div
  whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
  layout
  transition={{ layout: { type: "spring", stiffness: 350, damping: 30 } }}
/>

// Card enter/exit
<AnimatePresence mode="popLayout">
  <motion.div
    key={task.id}
    layout
    initial={{ opacity: 0, y: -8, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2 }}
  />
</AnimatePresence>

// Column drop target glow
<motion.div animate={isOver
  ? { backgroundColor: "rgba(34,211,238,0.05)", borderColor: "rgba(34,211,238,0.3)" }
  : { backgroundColor: "transparent" }
} />
```

Map your palette to **shadcn CSS variables** for seamless component integration:

```css
.dark {
  --background: 222 64% 7%;        /* #0A0E1A */
  --foreground: 210 40% 96%;       /* #F1F5F9 */
  --card: 224 40% 13%;             /* #161B2E */
  --muted: 224 40% 11%;            /* #111627 */
  --muted-foreground: 215 20% 55%; /* #94A3B8 */
  --border: 224 36% 18%;           /* #1E2642 */
  --primary: 187 92% 53%;          /* #22D3EE */
  --ring: 187 92% 53%;
}
```

---

## What to build first, and what to skip

**V1 priority order** (ship each before moving to the next):

1. **Supabase schema + basic CRUD** — tables, RLS, `POST /api/items` endpoint
2. **Command palette** (`cmdk` via shadcn/ui Command) — the universal input
3. **Kanban board** with drag-and-drop (`dnd-kit`) and optimistic updates
4. **Keyboard shortcuts** — `c` create, `s` status, `p` priority, `j/k` navigation, `Cmd+K` palette
5. **Natural language quick-add** — regex parser + chrono-node dates
6. **Multi-project sidebar** with colored dots and "Everything" view
7. **Filter bar** — project and priority quick chips, with saved views
8. **Telegram bot** — grammY webhook for capture from mobile
9. **Supabase Realtime** — sync for shared project collaboration
10. **Animations** — Framer Motion polish (drag lift, enter/exit, staggered loading)

**What to skip for V1:**

- **Virtual scrolling** — you won't have 200+ items per column. Add it only if performance degrades.
- **List view** — Kanban is the primary view. List view is a V2 feature.
- **Calendar/timeline views** — nice-to-have, not essential for a personal tool.
- **CRDTs or sync engine** — Last-Write-Wins with optimistic updates is sufficient. Linear built their sync engine for 1000+ user workspaces. You don't need it.
- **AI auto-categorization** — implement the manual flow first. LLM suggestions can layer on later via a simple `gpt-4o-mini` call with structured outputs.
- **Undo/redo** — the command pattern is clean but not essential for V1. A toast with "Undo" button on status changes covers 90% of the need.
- **Activity log** — defer the `activity_log` table until you need audit trails for shared projects.
- **Mobile-responsive layout** — "acceptable on tablet" is the spec. Don't invest in mobile-first layouts for a desktop power tool.
- **Rich text descriptions** — plain text or basic Markdown is fine for V1. Rich text editors (Tiptap, ProseMirror) are large, complex, and rarely needed for task descriptions.

## Conclusion

The architecture maps cleanly to a single developer's workflow: **Supabase handles auth, database, real-time, and edge functions**. TanStack Query manages server state with optimistic updates. Zustand holds ephemeral UI state. dnd-kit powers the kanban. cmdk powers the command palette. Fractional indexing makes drag-and-drop a single-row update.

The most impactful UX decisions aren't about libraries — they're about keyboard shortcuts, optimistic updates, and a single-input capture flow that parses `fix auth bug p1 @golems tomorrow` into a fully categorized backlog item in under a second. Build the capture pipeline first, the board second, and the polish third. The dark theme palette with blue-tinted surfaces and your cyan/purple/emerald accents will feel cohesive from day one if you set up the CSS variables correctly.

One non-obvious insight from studying these tools: **Linear's real innovation isn't the sync engine — it's the interaction grammar**. Single-key shortcuts (`c`, `s`, `p`, `l`) with a consistent `g+key` navigation pattern create muscle memory that makes the tool disappear. Invest time in designing your shortcut grammar early. It's cheaper than any animation library and delivers more perceived speed.