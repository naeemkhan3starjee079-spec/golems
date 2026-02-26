# @golems/orchestrator

> n8n orchestration layer for content pipelines + Bun render microservice.

## What it does

Routes content creation requests through n8n workflows. A Bun HTTP microservice (port 3001) wraps `@golems/content` APIs — ComfyUI image generation, Remotion video rendering, and data visualization — as HTTP endpoints that n8n workflow nodes can call.

## Quick start

```bash
bun run packages/orchestrator/src/render-service.ts
# Render service on http://localhost:3001
```

## Key routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/comfyui/generate` | Image generation via Flux + quality scoring |
| `POST` | `/api/remotion/render` | Render Remotion composition to video |
| `POST` | `/api/dataviz/render` | Branded data visualization |
| `POST` | `/api/pipeline/route` | AI-route idea to best pipeline |
| `GET`  | `/api/health` | Health check |

## Dependencies

- `@golems/content` — ComfyUI client, Remotion renderer, quality scoring
- `@golems/shared` — Supabase, notifications

## Status

Render service is code-complete. n8n workflows created but not yet deployed to production.
