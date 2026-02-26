# Orchestrator

> n8n orchestration layer for content pipelines + Bun render microservice.

## Architecture

```text
packages/orchestrator/
├── src/
│   └── render-service.ts     # Bun HTTP microservice (port 3001)
├── workflows/                # n8n workflow JSON templates
│   ├── image-generation.json # ComfyUI Flux generation pipeline
│   ├── video-render.json     # Remotion render pipeline
│   ├── ai-routing.json       # AI classifier → pipeline router
│   └── data-viz-schedule.json # Weekly data viz generation
├── scripts/
│   ├── backup-workflows.sh   # Export workflows from n8n
│   └── restore-workflows.sh  # Import workflows into n8n
├── docker-compose.yml        # n8n + PostgreSQL (Docker)
├── .env.example              # Required environment variables
├── CLAUDE.md                 # This file
└── package.json
```

## Render Microservice

Bun HTTP server on port 3001. Called by n8n via HTTP Request nodes.

```bash
# Start the render service
bun run dev    # or: bun run packages/orchestrator/src/render-service.ts
```

### Routes

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
| `GET` | `/api/pipelines` | List available pipelines (from registry) |

### ComfyUI Generate Request

```json
{
  "prompt": "A minimalist logo on dark background",
  "style": "social",
  "quality": "social",
  "quick": false,
  "maxRetries": 3
}
```

## n8n Setup

### Cloud (recommended for now)

n8n Cloud instance: `etanheyman.app.n8n.cloud`

### Self-Hosted (Docker)

```bash
# Requires Docker Desktop or OrbStack
cp .env.example .env
# Edit .env with secrets
docker compose up -d

# Access n8n at http://localhost:5678
```

### Workflow Import

```bash
# Import workflow templates into n8n
bash scripts/restore-workflows.sh http://localhost:5678

# Backup current workflows
bash scripts/backup-workflows.sh http://localhost:5678
```

## n8n Workflows

| Workflow | Trigger | Pipeline |
|----------|---------|----------|
| **AI Router** | Telegram message | Classifies intent → routes to pipeline |
| **Image Generation** | Sub-workflow | ComfyUI Flux → quality gate → Telegram |
| **Video Render** | Sub-workflow | Remotion render → Telegram |
| **Data Viz Schedule** | Every Monday 9am | Fetch data → render infographics → Telegram |

## Dependencies

- `@golems/content` — ComfyUI client, Remotion renderer, quality scoring, data viz
- `@golems/shared` — Supabase, notifications

## Current State

- **Render microservice:** Code complete, untested in production. Wraps `@golems/content` APIs as HTTP endpoints.
- **n8n Cloud:** Account exists at `etanheyman.app.n8n.cloud`. Workflows not yet imported.
- **Docker setup:** `docker-compose.yml` ready for self-hosted n8n. Not yet deployed.
- **Workflow JSON templates:** Created but not validated against a running n8n instance.

### What Works
- Render service starts and serves all routes locally
- Workflow JSON files are valid n8n format with correct node structure

### What Needs Setup
1. Import workflow templates into n8n Cloud (or spin up Docker)
2. Configure n8n credentials: ComfyUI URL, Telegram bot token, Supabase keys
3. Test end-to-end: Telegram trigger → AI router → pipeline execution → delivery
4. Set up error handling webhooks (n8n → Telegram alerts on failure)
