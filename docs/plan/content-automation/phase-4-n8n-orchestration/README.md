# Phase 4: n8n Orchestration Layer

> [Back to main plan](../README.md)

## Goal

Deploy n8n as the visual workflow orchestration layer connecting all content pipelines, with Telegram triggers, Claude AI routing, and bidirectional MCP integration with the golem ecosystem.

## Key Decisions (from deep research)

- **Orchestrator:** n8n (confirmed over Temporal, Inngest, Windmill, BullMQ)
- **Architecture:** n8n (Docker) → Bun HTTP microservice (:3001) → backends (ComfyUI, Remotion, Satori)
- **Hosting:** Start with n8n Cloud → migrate to self-hosted Railway (~$5/mo)
- **Monorepo:** `packages/orchestrator/` for Docker Compose, workflow backups, scripts
- **MCP:** Bidirectional — n8n calls golem MCP servers, Claude Code calls n8n workflows
- **File handling:** Filesystem binary mode (not DB) — large images/videos
- **Concurrency:** Limit 3 — prevents GPU exhaustion from parallel heavy jobs

## Tools

- **Research:** deep research (user) — DONE (see findings.md)
- **Research:** gemini — "n8n Docker best practices Mac M1, webhook patterns"
- **Code:** cursor — Docker Compose, Bun microservice routes, n8n workflow JSON
- **MCPs:** supabase (workflow metadata), zikaron (past patterns)

## Steps

1. **Validate on n8n Cloud (Phase 0)**
   - Use existing instance at `etanheyman.app.n8n.cloud`
   - Configure Telegram, Supabase, and Anthropic credentials
   - Build MVP workflow: Schedule Trigger → Supabase query → Code format → Telegram send
   - Run for 5 days to validate approach

2. **Create `packages/orchestrator/` structure**
   ```
   packages/orchestrator/
   ├── docker-compose.yml
   ├── .env.example
   ├── workflows/           # Exported workflow JSON backups
   ├── scripts/
   │   ├── backup-workflows.sh
   │   ├── restore-workflows.sh
   │   └── setup.sh
   ├── docs/
   │   └── workflow-catalog.md
   ├── package.json
   └── README.md
   ```

3. **Deploy n8n locally via Docker Compose**
   - n8n + PostgreSQL 16 + filesystem binary storage
   - `host.docker.internal` for reaching host services
   - Memory limits: n8n 2GB, Postgres 512MB
   - `EXECUTIONS_TIMEOUT=-1` (no timeout for long Flux generations)
   - `N8N_CONCURRENCY_PRODUCTION_LIMIT=3`
   - Prometheus metrics enabled

4. **Build Bun HTTP microservice**
   - `packages/orchestrator/src/render-service.ts` (Bun.serve on port 3001)
   - Routes wrapping existing TypeScript code:
     - `POST /api/comfyui/queue` → ComfyUI client (Phase 3)
     - `GET /api/comfyui/status/:id` → poll generation status
     - `GET /api/comfyui/image/:id` → retrieve generated image
     - `POST /api/remotion/render` → Remotion renderer (Phase 2)
     - `POST /api/satori/generate` → Satori JSX→SVG
     - `POST /api/sharp/composite` → Sharp compositing
     - `POST /api/dataviz/render` → D3/Recharts → Remotion

5. **Install n8n community nodes**
   - `n8n-nodes-comfyui` — ComfyUI queue-wait-retrieve cycle
   - `@johnlindquist/n8n-nodes-claudecode` — Claude Code integration (self-hosted only)
   - `n8n-MCP` — Claude Code knowledge of all 1,084 n8n nodes

6. **Configure MCP integration**
   - MCP Client Tool → connect to golem MCP servers (Supabase, Zikaron, Jobs, Email)
   - MCP Server Trigger → expose n8n workflows as tools for Claude Code
   - Test bidirectional: Claude Code triggers n8n workflow → n8n AI Agent calls golem MCP

7. **Build content pipeline workflows (sub-workflows)**
   - **Image Generation:** Telegram Trigger → Code (build ComfyUI workflow JSON) → HTTP Request (POST /api/comfyui/queue) → Poll loop → Quality scoring → Brand overlay → Telegram preview
   - **Video Render:** Telegram Trigger → Code (build Remotion props) → HTTP Request (POST /api/remotion/render) → Poll status → Telegram send video
   - **Template Fill:** Data source → HTTP Request (POST /api/satori/generate) → Sharp composite → Output
   - **Data Viz:** Supabase query → HTTP Request (POST /api/dataviz/render) → Animated chart video
   - **Figma-to-Remotion:** Figma screenshot → iterative comparison loop → refined composition → render

8. **Build AI routing workflow (orchestrator)**
   - Telegram Trigger → AI Agent (Claude Sonnet) with tools:
     - HTTP Request Tool → Bun microservice
     - Call n8n Workflow Tool → triggers sub-workflows
     - MCP Client Tool → golem MCP servers
   - Claude interprets natural language: "generate sunset watercolor and animate it" → routes to Flux → Remotion → brand overlay
   - Structured Output Parser enforces JSON with `classification`, `confidence`, `pipeline`

9. **Build approval gates**
   - Telegram inline keyboard: Approve / Reject / Edit prompt
   - Wait node with `$execution.resumeUrl`
   - Callback Query listener workflow to resume paused pipelines
   - Timeout: 24h default, auto-reject with notification

10. **Error handling and monitoring**
    - Global error workflow: Error Trigger → format → Telegram alert → Supabase log
    - Retry On Fail on all HTTP Request nodes (3 attempts, 30s delay)
    - Health endpoint check for all services
    - Prometheus metrics at n8n `/metrics`

11. **Workflow version control**
    - Cron-based export: `n8n export:workflow --all --separate` → `packages/orchestrator/workflows/`
    - Git commit + push via backup script
    - Or: n8n self-backup workflow (Schedule → Export → GitHub API)

12. **Wire into golems ecosystem**
    - `golems doctor` health check for n8n (port 5678 `/healthz`)
    - `golems wizard` setup phase for n8n Docker Compose
    - Launchd plist or Docker restart policy for auto-start

## Migration Path (launchd → n8n)

Once content pipelines work, gradually migrate existing launchd schedules:
- Email polling (every 10 min) → n8n Schedule Trigger
- Job scraping (3x daily) → n8n Schedule Trigger
- Morning briefing (8am) → n8n Schedule Trigger
- Night shift (4am) → n8n Schedule Trigger

Use "Shadow Mode": run both launchd + n8n for 1 week, compare outputs, then disable launchd.

## Depends On

- Phase 2 (Remotion render must be callable via API)
- Phase 3 (ComfyUI must be callable via API)

## Status

- [x] Deep research results incorporated (both docs)
- [ ] MVP validated on n8n Cloud
- [ ] `packages/orchestrator/` structure created
- [ ] Docker Compose deployed locally
- [ ] Bun HTTP microservice (render-service)
- [ ] Community nodes installed
- [ ] MCP integration (bidirectional)
- [ ] Image generation sub-workflow
- [ ] Video render sub-workflow
- [ ] Template fill sub-workflow
- [ ] AI routing workflow (Claude agent)
- [ ] Approval gates (Telegram inline keyboard)
- [ ] Error handling + monitoring
- [ ] Workflow version control
- [ ] Golems doctor/wizard integration
