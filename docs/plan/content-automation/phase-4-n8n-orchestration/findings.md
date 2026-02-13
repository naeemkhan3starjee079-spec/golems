# Phase 4 Findings

## Decisions

- **Orchestrator:** n8n — wins on visual builder + 400+ integrations + native MCP + AI Agent with Claude + community ComfyUI node
- **Hosting strategy:** Start with existing n8n Cloud (etanheyman.app.n8n.cloud) for validation → migrate to self-hosted Railway (~$5/mo) for unlimited executions + Execute Command node
- **Architecture:** n8n (Docker, port 5678) → Bun HTTP microservice (host, port 3001) → backends (ComfyUI :8188, Remotion bundler, Satori/Sharp)
- **Monorepo location:** `packages/orchestrator/` — Docker Compose, workflow JSON backups, scripts
- **Binary data:** Filesystem mode (not DB) — prevents OOM on large images/videos
- **Timeout:** Disabled (`EXECUTIONS_TIMEOUT=-1`) — Flux generation takes 15+ min
- **Concurrency:** Limit 3 (`N8N_CONCURRENCY_PRODUCTION_LIMIT=3`) — prevents GPU exhaustion
- **MCP integration:** Bidirectional — MCP Client Tool connects to golem MCP servers, MCP Server Trigger exposes n8n workflows to Claude Code
- **AI routing:** Claude AI Agent node with Anthropic Chat Model + HTTP Request Tool + Call n8n Workflow Tool + MCP Client Tool
- **Alternatives rejected:** Temporal (overkill, no visual editor), Inngest (good fallback but less integrations), Windmill (Deno not Bun), BullMQ (too much custom code)
- **Fallback plan:** If n8n bottlenecks, switch to Inngest or Trigger.dev — Bun microservice endpoints work identically with any orchestrator

## Research

Full deep research docs:
- `compass_artifact_wf-abf9b6c2-75e3-4307-aca0-bea6ef2c6a79_text_markdown.md` — architecture, Docker Compose, integration patterns, risk assessment
- `compass_artifact_wf-6ecd6c1e-51c6-48e9-855d-04592b0e0782_text_markdown.md` — AI capabilities, multi-agent orchestration, 7 concrete workflows, roadmap

### Key Architecture

```
TELEGRAM (triggers + previews + approvals)
  → n8n ORCHESTRATOR (Docker, port 5678)
    → AI Agent (Claude) picks pipeline
    → Sub-workflows: Image Gen | Video Render | Template | Data Viz
      → BUN MICROSERVICE (host, port 3001)
        POST /api/comfyui/queue     → ComfyUI client
        POST /api/remotion/render   → Remotion renderer
        POST /api/satori/generate   → Satori JSX→SVG
        POST /api/sharp/composite   → Sharp compositing
        POST /api/dataviz/render    → D3/Recharts→Remotion
          → ComfyUI :8188 | Remotion bundler
```

### Docker Compose Ready

Research includes production-ready Docker Compose with:
- PostgreSQL 16 backend
- Filesystem binary data mode
- Host networking (`host.docker.internal`)
- Memory limits (n8n 2GB, Postgres 512MB)
- Prometheus metrics enabled
- TZ = Asia/Jerusalem

### Memory Budget on M1 Pro (36GB)

| Service | RAM |
|---------|-----|
| ComfyUI + Flux | ~12-15 GB |
| Remotion | ~4 GB |
| n8n | ~2 GB |
| PostgreSQL | ~0.5 GB |
| macOS | ~4 GB |
| **Total peak** | **~22.5 GB** |
| **Headroom** | **~13.5 GB** |

Rule: ComfyUI and Remotion run sequentially, NEVER in parallel.

### n8n Cloud vs Self-Hosted

| Feature | Cloud (current) | Self-Hosted Railway |
|---------|----------------|---------------------|
| Executions | 2,500/mo | Unlimited |
| Execute Command node | Blocked | Available |
| RAM | 320 MiB | Configurable |
| Cost | $24/mo (Starter) | ~$5/mo |
| MCP/Claude Code | Limited | Full |

### Risk Assessment

1. **No durable execution** — n8n crash = lost execution. Design for idempotency, checkpoint to Supabase.
2. **Memory pressure** — concurrent ComfyUI + Remotion hits 28GB. Mitigate with concurrency limit + sequential pipelines.
3. **Binary data bloat** — auto-prune after 14 days, move finals to Supabase Storage.
4. **Webhook registration** — occasional failures after restart. Set WEBHOOK_URL explicitly.
5. **Licensing** — "Sustainable Use License", not true OSS. Personal use explicitly permitted. Pin Docker tag.

### Community Nodes to Install

- `n8n-nodes-comfyui` — handles queue-wait-retrieve cycle
- `@johnlindquist/n8n-nodes-claudecode` — Claude Code integration (self-hosted only)
- `n8n-MCP` (github.com/czlonkowski/n8n-mcp) — gives Claude knowledge of all 1,084 n8n nodes

### Workflow Versioning (Community Edition)

No native Git integration. Workaround: cron-based export script or n8n workflow that auto-exports to GitHub daily.

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Deep research (n8n architecture) | user (Claude.ai) | done |
| Deep research (n8n + Golems integration) | user (Claude.ai) | done |
| Update phase README with findings | opus | pending |

## Notes

- n8n has native Telegram, Supabase, and Anthropic nodes — no custom code needed for these
- Human-in-the-loop (Jan 2026 release) adds gated tool approval via Telegram
- Sub-workflow executions don't count against execution limits
- `@stable-canvas/comfyui-client` TS package + n8n community node = two paths to ComfyUI integration
- Consider eventually replacing ALL launchd jobs with n8n schedules (email, job scraping, briefing, night shift)
- n8n's AI Agent can be the intelligent router: "generate sunset in watercolor and animate it" → routes to Flux → Remotion → brand overlay
