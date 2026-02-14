# Golems Dashboard

> Next.js web dashboard — 3D brain view, ops monitoring, backlog kanban, content pipeline, token tracking.

## Role

The dashboard is a **multi-tenant web app** for visualizing and managing the Golems ecosystem. It provides real-time views into the Zikaron knowledge graph, service health, token usage, and project backlog. Deployed on Vercel at `etanheyman.com` with Supabase auth.

## Architecture

```text
packages/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, metadata, dark mode)
│   │   ├── (auth)/                 # Auth route group (no sidebar)
│   │   │   ├── layout.tsx          # Centered minimal layout
│   │   │   ├── login/page.tsx      # Email/password + GitHub OAuth
│   │   │   └── signup/page.tsx     # Registration with email confirmation
│   │   ├── auth/callback/route.ts  # OAuth callback handler
│   │   └── (dashboard)/            # Protected route group (sidebar + topbar)
│   │       ├── layout.tsx          # Sidebar + TopBar + MobileNav + SearchOverlay
│   │       ├── page.tsx            # Brain View (3D knowledge graph)
│   │       ├── emails/page.tsx      # Email inbox with sender profiles
│   │       ├── jobs/page.tsx       # Job listings with match scores
│   │       ├── notifications/page.tsx # Notification history + filters
│   │       ├── ops/page.tsx        # Ops dashboard (service health, events, Night Shift)
│   │       ├── recruiter/page.tsx  # Outreach pipeline + LinkedIn stats
│   │       ├── teller/page.tsx     # Subscription tracker + payments
│   │       ├── backlog/page.tsx    # Kanban board (drag-and-drop)
│   │       ├── content/page.tsx    # Content pipeline status
│   │       ├── enrichment/page.tsx # Enrichment progress tracker
│   │       ├── tokens/page.tsx     # LLM token usage + cost tracking
│   │       ├── session/page.tsx    # Session detail viewer
│   │       └── settings/page.tsx   # Account, graph upload, sign out
│   ├── components/
│   │   ├── brain-graph.tsx         # 3D force graph (react-force-graph-3d / Three.js)
│   │   ├── brain-minimap.tsx       # 2D minimap overlay
│   │   ├── brain-search.tsx        # Search bar with match counter
│   │   ├── brain-stats.tsx         # Node/edge/project count badges
│   │   ├── node-panel.tsx          # Side panel for selected node details
│   │   ├── search-overlay.tsx      # Global search (Cmd+K)
│   │   ├── sidebar.tsx             # Desktop sidebar navigation
│   │   ├── top-bar.tsx             # Header with user, search, sign out
│   │   ├── mobile-nav.tsx          # Bottom tab bar (mobile)
│   │   └── skeleton.tsx            # Loading skeletons
│   ├── lib/
│   │   ├── types.ts                # BrainGraph, GraphNode, GraphEdge interfaces
│   │   ├── format.ts               # Number/date formatting utilities
│   │   ├── graph-colors.ts         # Color palette for graph nodes
│   │   └── supabase/
│   │       ├── client.ts           # Browser-side Supabase client
│   │       ├── server.ts           # Server-side Supabase client (cookies)
│   │       ├── middleware.ts        # Auth session refresh + route protection
│   │       └── graph.ts            # Upload/download graph.json to Storage
│   └── middleware.ts               # Next.js middleware entry (auth)
├── vercel.json                     # Vercel deployment config
├── next.config.ts                  # Rewrites to Zikaron daemon, standalone output
├── .env.local                      # Supabase credentials (gitignored)
└── package.json                    # dashboard (private)
```

## Dependencies

- `next` 16.1.6, `react` 19.2.3 — App Router with route groups
- `@supabase/ssr` + `@supabase/supabase-js` — Auth (email, OAuth, cookies)
- `react-force-graph-3d` + `three` — 3D knowledge graph visualization
- `lucide-react` — Icons
- `tailwindcss` 4 — Styling

## Pages

| Path | Page | Data Source |
|------|------|-------------|
| `/` | Brain View — 3D knowledge graph with search, minimap, presentation mode, PNG export | Supabase Storage (`brain-graphs/{user_id}/graph.json`) |
| `/ops` | Ops Dashboard — service health, events, Night Shift status | Supabase `golem_events`, `service_runs`, `golem_state` |
| `/notifications` | Notification History — timeline with severity filters, expandable data | Supabase `golem_events` (notification types) |
| `/backlog` | Kanban Board — columns (Backlog/In Progress/Done/Archived) with CRUD | Supabase `backlog_items` |
| `/jobs` | Jobs — job listings with search, match scores, scrape activity | Supabase `golem_jobs`, `scrape_activity` |
| `/emails` | Emails — email list with sender profiles, category filters | Supabase `emails`, `email_senders` |
| `/recruiter` | Recruiter — outreach pipeline, LinkedIn network stats | Supabase `outreach_contacts`, `outreach_messages`, `linkedin_connections` |
| `/teller` | Teller — subscription tracker, payment history | Supabase `subscriptions`, `payments` |
| `/content` | Content Pipeline — pipeline runs, routing stats, recent outputs | Supabase `pipeline_runs` |
| `/enrichment` | Enrichment Progress — chunk processing stats, enrichment queue | Daemon `/api/stats/enrichment` (local only) |
| `/tokens` | Token Tracking — LLM usage by model, daily costs, aggregates | Supabase `llm_usage` |
| `/session` | Session Detail — drill into a specific session's chunks | Daemon `/api/session/:id` (local only) |
| `/settings` | Account — user email, graph.json upload, sign out | Supabase Auth + Storage |
| `/login` | Login — email/password + GitHub OAuth | Supabase Auth |
| `/signup` | Signup — registration with email confirmation | Supabase Auth |

## Data Architecture

### Supabase-First Architecture

The dashboard queries Supabase directly for most pages — no daemon required on Vercel:

| Page | Data Source | Works on Vercel? |
|------|-------------|-----------------|
| Brain View | Supabase Storage (`brain-graphs/{user_id}/graph.json`) | Yes |
| Ops | `golem_events`, `service_runs`, `golem_state` tables | Yes |
| Notifications | `golem_events` (filtered by notification types) | Yes |
| Tokens | `llm_usage` table (client-side aggregation) | Yes |
| Backlog | `backlog_items` table (full CRUD) | Yes |
| Jobs | `golem_jobs`, `scrape_activity` tables | Yes |
| Emails | `emails`, `email_senders` tables | Yes |
| Recruiter | `outreach_contacts`, `outreach_messages`, `linkedin_connections` tables | Yes |
| Teller | `subscriptions`, `payments` tables | Yes |
| Content | `pipeline_runs` table | Yes |
| Enrichment | Zikaron daemon `/api/stats/enrichment` | No — requires local daemon |
| Session | Zikaron daemon `/api/session/:id` | No — requires local daemon |

Query functions live in `src/lib/supabase/queries.ts`.

For local dev, set `ZIKARON_DAEMON_URL=http://localhost:8787` in `.env.local` to enable daemon proxy for enrichment and session pages.

### Supabase Tables (with RLS)

| Table | Purpose | RLS |
|-------|---------|-----|
| `backlog_items` | Kanban board items | user_id = auth.uid() |
| `pipeline_runs` | Content pipeline execution logs | user_id = auth.uid() |
| `llm_usage` | Token usage and cost tracking | user_id = auth.uid() |
| `service_heartbeats` | Service health pings | user_id = auth.uid() |
| `service_runs` | Cron job execution logs | Read: authenticated, Write: service_role |
| `golem_events` | Event log (all golems) | Read: authenticated, Write: service_role |
| `golem_state` | Key-value state (Night Shift target, rotation) | Read: authenticated, Write: service_role |
| `golem_jobs` | Job listings from scraper | Read: authenticated, Write: service_role |
| `scrape_activity` | Scraping run logs | Read: authenticated, Write: service_role |
| `emails` | Email inbox with AI scoring | Read: authenticated, Write: service_role |
| `email_senders` | Sender profiles and actions | Read: authenticated, Write: service_role |
| `outreach_contacts` | Recruiter outreach contacts | Read: authenticated, Write: service_role |
| `outreach_messages` | Outreach messages | Read: authenticated, Write: service_role |
| `linkedin_connections` | LinkedIn network data | Read: authenticated, Write: service_role |
| `subscriptions` | Subscription tracking | Read: authenticated, Write: service_role |
| `payments` | Payment records | Read: authenticated, Write: service_role |

Legacy rows (null user_id) are readable by all authenticated users.

### Supabase Storage

- **Bucket:** `brain-graphs` (public: false)
- **Structure:** `{user_id}/graph.json`
- **Policies:** Users can only CRUD their own folder

## Auth Flow

1. Middleware (`src/middleware.ts`) refreshes session on every request
2. Unauthenticated users → redirected to `/login`
3. Authenticated users on auth pages → redirected to `/`
4. OAuth callback at `/auth/callback` exchanges code for session
5. Sign out via TopBar button or Settings page

## Deployment

### Vercel

| Setting | Value |
|---------|-------|
| Framework | Next.js (auto-detected) |
| Root Directory | `packages/dashboard` |
| Install Command | `bun install` |
| Build Command | `bun run build` |

**Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mkijzwkuubtfjqcemorx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ZIKARON_DAEMON_URL` | Optional — URL of hosted daemon (omit for Supabase-only mode) |

### Local Dev

```bash
cd packages/dashboard
bun dev    # http://localhost:3000
```

Requires `.env.local` with Supabase credentials. Optionally run `zikaron daemon --http 8787` for real-time data.

## Brain View Features

- **3D Force Graph** — nodes colored by project, sized by chunk count
- **Search** — filter nodes by label/project/branch/plan with match counter
- **Minimap** — 2D overview with viewport indicator
- **Node Panel** — click node to see details (session, chunks, connections)
- **Presentation Mode** — fullscreen (Fullscreen API) with UI chrome hidden
- **PNG Export** — captures canvas as date-stamped image
- **URL Params** — `?node=<id>` deep-links to a specific node

## Key Patterns

### Route Groups
- `(auth)` — minimal centered layout, no sidebar/topbar
- `(dashboard)` — full layout with sidebar, topbar, mobile nav, search overlay

### Responsive Design
- Desktop: sidebar + scrollable content area
- Mobile: bottom tab nav, padding for safe areas (notched phones)

### SEO
- OpenGraph metadata on root layout
- Separate `export const viewport: Viewport` (Next.js 16 pattern)
- `viewportFit: "cover"` for edge-to-edge on mobile
