# Golems Dashboard

> Next.js web dashboard for the Golems AI agent ecosystem — 3D knowledge graph, ops monitoring, job tracking, and more.

**Live at [etanheyman.com](https://etanheyman.com)** | Deployed on Vercel

## What It Does

A multi-page web app that visualizes and manages the entire Golems ecosystem:

| Page | What You See |
|------|-------------|
| **Brain View** | Interactive 3D knowledge graph (react-force-graph-3d / Three.js) with search, minimap, and PNG export |
| **Ops** | Service health, golem events, Night Shift status |
| **Jobs** | Job listings with LLM match scores and scrape activity |
| **Emails** | Inbox with AI scoring, sender profiles, category filters |
| **Recruiter** | Outreach pipeline, LinkedIn network stats |
| **Teller** | Subscription tracker, payment history |
| **Backlog** | Kanban board with drag-and-drop |
| **Content** | Content pipeline runs and routing stats |
| **Tokens** | LLM usage by model, daily costs |
| **Docs** | 24 interactive documentation pages |

## Tech Stack

- **Next.js 16** (App Router, route groups, server components)
- **Supabase** (Postgres + Auth + Storage + RLS)
- **react-force-graph-3d** + **Three.js** (3D knowledge graph)
- **Tailwind CSS 4** (styling)
- **gray-matter** + **marked** (markdown docs)
- **lucide-react** (icons)

## Quick Start

```bash
cd packages/dashboard
cp .env.example .env.local   # Add Supabase credentials
bun dev                       # http://localhost:3000
```

## Architecture

Two route groups keep auth and dashboard layouts separate:

- `(auth)/` — minimal centered layout for login/signup
- `(dashboard)/` — sidebar + topbar + mobile nav + search overlay (Cmd+K)

All pages query Supabase directly (no backend required). Two pages (`/enrichment`, `/session`) optionally connect to a local BrainLayer daemon for real-time data.

## Deployment

Deployed on Vercel with auto-builds from the monorepo root:

| Setting | Value |
|---------|-------|
| Root Directory | `packages/dashboard` |
| Framework | Next.js (auto-detected) |
| Install Command | `bun install` |

Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars.
