---
title: "Orchestrator — n8n + Render Service"
description: "n8n workflow orchestration and Bun render microservice for content pipeline automation."
---

# Orchestrator

> n8n orchestration layer for content pipelines + Bun render microservice.

## What It Does

The Orchestrator package provides two things:

1. **Bun Render Microservice** (port 3001) — HTTP API wrapping ContentGolem's pipelines (ComfyUI, Remotion, DataViz, Pipeline Router)
2. **n8n Workflow Templates** — Automation workflows that chain pipeline steps, triggered by Telegram messages or schedules

## Render Microservice

Bun HTTP server that exposes ContentGolem capabilities as REST endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/comfyui/generate` | Generate image via Flux + quality scoring |
| `GET` | `/api/comfyui/status` | Check ComfyUI server status |
| `POST` | `/api/remotion/render` | Render Remotion composition to video |
| `POST` | `/api/remotion/still` | Capture single frame |
| `POST` | `/api/dataviz/render` | Generate branded data visualization |
| `POST` | `/api/pipeline/route` | AI-route idea to best pipeline |
| `POST` | `/api/pipeline/execute` | Route + execute in one call |
| `GET` | `/api/pipeline/stats` | Pipeline performance statistics |
| `GET` | `/api/health` | Health check |

```bash
# Start the render service
bun run dev    # http://localhost:3001
```

## n8n Workflows

| Workflow | Trigger | Pipeline |
|----------|---------|----------|
| **AI Router** | Telegram message | Classifies intent > routes to pipeline |
| **Image Generation** | Sub-workflow | ComfyUI Flux > quality gate > Telegram |
| **Video Render** | Sub-workflow | Remotion render > Telegram |
| **Data Viz Schedule** | Every Monday 9am | Fetch data > render infographics > Telegram |

### Setup

n8n Cloud instance available at `etanheyman.app.n8n.cloud`. Self-hosted option via `docker-compose.yml` (n8n + PostgreSQL).

```bash
# Import workflow templates
bash scripts/restore-workflows.sh http://localhost:5678

# Backup current workflows
bash scripts/backup-workflows.sh http://localhost:5678
```

## Current State

- **Render microservice:** Code complete, wraps `@golems/content` APIs
- **n8n Cloud:** Account exists, workflows not yet imported
- **Workflow templates:** Created in valid n8n JSON format

## Dependencies

- `@golems/content` — ComfyUI client, Remotion renderer, quality scoring, data viz
- `@golems/shared` — Supabase, notifications

## Source

[`packages/orchestrator/`](https://github.com/EtanHey/golems/tree/master/packages/orchestrator)
