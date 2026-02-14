# n8n as the orchestration brain for your golem ecosystem

**n8n is the right choice for your visual content automation system**, and the Community Edition is all you need. Your existing cloud instance at `etanheyman.app.n8n.cloud` cannot reach localhost services like ComfyUI, so you'll need a local Docker Compose deployment alongside it. The architecture that works best: n8n handles orchestration, routing, and visual workflow design while your existing TypeScript functions run as a lightweight HTTP microservice on the host. This gives you drag-and-drop pipeline editing, native Telegram/Supabase/Claude integration, MCP interop with Claude Code, and community nodes for ComfyUI — all free, all running on your Mac M1 Pro with room to spare.

The critical insight is that n8n isn't replacing your TypeScript code — it's **wrapping it in a visual orchestration layer** that adds retry logic, branching, approval gates, and monitoring without rewriting anything. Your ~36GB unified memory comfortably fits n8n (~500MB), PostgreSQL (~200MB), ComfyUI (~12GB for Flux), and Remotion (~4GB) with headroom.

---

## Architecture: how everything connects

The recommended architecture uses three layers: n8n as the orchestrator, a Bun HTTP microservice exposing your TypeScript functions, and the existing tools (ComfyUI, Remotion, Supabase) as backends.

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM                                  │
│              (triggers + previews + approvals)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     n8n ORCHESTRATOR                              │
│                  (Docker, port 5678)                              │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ AI Agent    │  │ Sub-workflow  │  │ Error Workflow          │  │
│  │ (Claude API)│  │ Router       │  │ → Telegram alert        │  │
│  │ + MCP Client│  │              │  │ → Supabase error log    │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
│         │                │                                       │
│  ┌──────▼────┐  ┌───────▼──────┐  ┌──────────┐  ┌───────────┐  │
│  │ Image Gen │  │ Video Render │  │ Template │  │ Data Viz  │  │
│  │ Sub-WF    │  │ Sub-WF       │  │ Sub-WF   │  │ Sub-WF    │  │
│  └──────┬────┘  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  │
└─────────┼──────────────┼───────────────┼───────────────┼────────┘
          │              │               │               │
          ▼              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│              BUN MICROSERVICE (host, port 3001)                   │
│                                                                   │
│  POST /api/comfyui/queue     → ComfyUI client (your TS code)    │
│  GET  /api/comfyui/status/:id → Poll generation status           │
│  GET  /api/comfyui/image/:id  → Retrieve generated image         │
│  POST /api/remotion/render    → Remotion renderer (your TS code) │
│  POST /api/satori/generate    → Satori JSX→SVG (your TS code)   │
│  POST /api/sharp/composite    → Sharp compositing (your TS code) │
│  POST /api/dataviz/render     → D3/Recharts → Remotion animated  │
└──────────┬─────────────┬──────────────────────────────────────────┘
           │             │
     ┌─────▼────┐  ┌────▼──────┐
     │ ComfyUI  │  │ Remotion  │
     │ :8188    │  │ (bundler) │
     │ Flux GPU │  │ h264 enc  │
     └──────────┘  └───────────┘
```

**Why this pattern works:** n8n connects to `http://host.docker.internal:3001` from inside Docker to reach your Bun microservice, which in turn calls ComfyUI at `localhost:8188` and Remotion directly. Your existing TypeScript code stays in your monorepo untouched — you're just adding thin HTTP route handlers.

---

## Docker Compose: production-ready configuration

This configuration runs n8n with PostgreSQL, filesystem binary data mode for large images/videos, Prometheus metrics, and proper host networking to reach ComfyUI and your Bun service.

```yaml
version: '3.8'

volumes:
  n8n_data:
  postgres_data:

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-n8n}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-n8n}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U ${POSTGRES_USER:-n8n}']
      interval: 5s
      timeout: 5s
      retries: 10
    deploy:
      resources:
        limits:
          memory: 512M

  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # Database
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: ${POSTGRES_DB:-n8n}
      DB_POSTGRESDB_USER: ${POSTGRES_USER:-n8n}
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}

      # URLs
      N8N_HOST: localhost
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://localhost:5678/

      # Binary data — CRITICAL for image/video pipelines
      N8N_DEFAULT_BINARY_DATA_MODE: filesystem
      N8N_BINARY_DATA_STORAGE_PATH: /home/node/.n8n/binaryData

      # Performance tuning for M1 Pro
      NODE_OPTIONS: --max-old-space-size=2048
      N8N_CONCURRENCY_PRODUCTION_LIMIT: 3

      # No timeout — image generation can take 15+ min
      EXECUTIONS_TIMEOUT: -1
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: 336

      # Monitoring
      N8N_METRICS: "true"
      N8N_METRICS_INCLUDE_DEFAULT_METRICS: "true"

      # Security
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}

      # Timezone
      GENERIC_TIMEZONE: ${TZ:-America/New_York}
      TZ: ${TZ:-America/New_York}

      # Community nodes as AI tools
      N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE: "true"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./shared-files:/files
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

Companion `.env` file:

```env
POSTGRES_USER=n8n
POSTGRES_PASSWORD=generate-a-strong-password-here
POSTGRES_DB=n8n
N8N_ENCRYPTION_KEY=generate-a-random-32-char-string
TZ=America/New_York
```

**Three critical settings** to understand: `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` prevents n8n from holding 50MB images in Node.js heap memory (the default mode crashes on large files). `N8N_CONCURRENCY_PRODUCTION_LIMIT=3` prevents n8n from launching five ComfyUI renders simultaneously and exhausting your GPU. `EXECUTIONS_TIMEOUT=-1` disables the execution timeout so Flux generations that take 15+ minutes won't be killed.

To access ComfyUI from inside n8n workflows, use `http://host.docker.internal:8188` instead of `localhost:8188`. The `extra_hosts` directive in the compose file maps this hostname to your Mac's host network. Same pattern for your Bun microservice at `http://host.docker.internal:3001`.

---

## Integration patterns: concrete implementations for each pipeline

### ComfyUI image generation pipeline

Two approaches exist. The **community node approach** uses `n8n-nodes-comfyui` (install via Settings → Community Nodes → enter `n8n-nodes-comfyui`), which handles the queue-wait-retrieve cycle internally and returns binary image data directly. This is the fastest path to a working pipeline.

The **HTTP polling approach** gives you more control and works without community nodes:

```
Telegram Trigger → Code Node (build workflow JSON) → HTTP Request (POST /prompt)
  → Loop: HTTP Request (GET /history/{prompt_id}) → IF (complete?) 
    → Yes: HTTP Request (GET /view?filename=...) → quality scoring → Telegram Send Photo
    → No: Wait (10s) → loop back
```

The Code node builds ComfyUI's workflow JSON. Export your ComfyUI workflow using "Save (API Format)" in ComfyUI's UI, then parameterize it:

```javascript
const prompt = $input.first().json.message.text;
const seed = Math.floor(Math.random() * 1e15);

// Your exported ComfyUI API workflow with dynamic values injected
const workflow = {
  "6": {
    "inputs": { "text": prompt, "clip": ["4", 1] },
    "class_type": "CLIPTextEncode"
  },
  "3": {
    "inputs": { "seed": seed, "steps": 30, "cfg": 3.5, "sampler_name": "euler" },
    "class_type": "KSampler"
  }
  // ... rest of your Flux workflow
};

return [{ json: { prompt: workflow } }];
```

The HTTP Request node POSTs to `http://host.docker.internal:8188/prompt` with body `{"prompt": {{$json.prompt}}}` and receives back a `prompt_id`. A polling loop then checks `GET /history/{prompt_id}` every 10 seconds until the status shows success, then retrieves the image via `GET /view?filename=...&type=output`.

### Remotion video rendering pipeline

No community node exists for Remotion, so the recommended pattern wraps your existing Remotion renderer in a Bun HTTP endpoint:

```typescript
// In your monorepo: packages/render-service/src/routes/remotion.ts
import { renderMedia, selectComposition, bundle } from "@remotion/renderer";

export async function handleRender(req: Request): Promise<Response> {
  const { compositionId, inputProps } = await req.json();
  const bundleLocation = await bundle({ entryPoint: "./src/index.ts" });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });
  
  const { buffer } = await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    inputProps,
    outputLocation: `/tmp/renders/${compositionId}-${Date.now()}.mp4`,
  });
  
  return new Response(buffer, {
    headers: { "Content-Type": "video/mp4" },
  });
}
```

For renders exceeding 30 seconds, use an async pattern: the POST returns a job ID immediately, a status endpoint reports progress, and n8n polls until complete. This mirrors the ComfyUI polling pattern and keeps n8n responsive.

In n8n, the workflow is: `Telegram Trigger → Code (build props) → HTTP Request (POST /api/remotion/render) → Poll status → Telegram Send Video`.

### Telegram triggers and approval gates

n8n's built-in Telegram Trigger node handles incoming messages. Configure it with your bot token (from @BotFather), set update types to "Message" and "Callback Query," and enable "Download Images" if users send reference photos.

For **human-in-the-loop approval** (reviewing generated content before publishing), use n8n's Wait node with an inline keyboard:

```
Generate Image → Code Node (build approval message) →
HTTP Request (Telegram sendMessage with inline_keyboard) →
Wait Node (On Webhook Call) → 
Switch (approved/rejected/edit) → branch accordingly
```

The Code node constructs the Telegram inline keyboard (use the HTTP Request node directly rather than the native Telegram node, which has limitations with dynamic keyboard arrays):

```javascript
const keyboard = [
  [
    { text: "✅ Approve", callback_data: `approve_${$execution.id}` },
    { text: "❌ Reject", callback_data: `reject_${$execution.id}` }
  ],
  [{ text: "📝 Edit prompt", callback_data: `edit_${$execution.id}` }]
];

return [{
  json: {
    chat_id: $json.message.chat.id,
    photo: $json.imageUrl,
    caption: `Generated from: "${$json.prompt}"`,
    reply_markup: JSON.stringify({ inline_keyboard: keyboard })
  }
}];
```

A separate workflow listens for Telegram Callback Queries, extracts the execution ID from `callback_data`, and POSTs to the Wait node's `$execution.resumeUrl` to resume the paused pipeline.

### Supabase data and metadata storage

Use the built-in **Postgres node** (more flexible than the Supabase node) for complex queries, and the **Supabase node** for simple CRUD. Connect via the Supabase transaction pooler: `aws-0-REGION.pooler.supabase.co:6543`.

For storing generation metadata after each pipeline run:

```sql
INSERT INTO generations (
  user_id, pipeline, prompt, model, parameters,
  output_url, duration_ms, status, created_at
) VALUES (
  $1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW()
) RETURNING id;
```

For the template pipeline, the Supabase node reads structured data (jobs, finance, brain data) that feeds into your Satori templates via the microservice.

### Claude AI agent with MCP integration

This is where n8n's architecture shines. The **AI Agent node** with **Anthropic Chat Model** (Claude Sonnet 4) acts as the intelligent router for your golem system. Configure it with tools:

- **HTTP Request Tool** → calls your Bun microservice endpoints
- **Call n8n Workflow Tool** → triggers sub-workflows (image gen, video render, template gen)
- **MCP Client Tool** → connects to your existing MCP servers (Supabase, memory, jobs)

The workflow: `Telegram Trigger → AI Agent (Claude) → [decides which pipeline to run] → Execute Sub-workflow → Return result to Telegram`. Claude interprets natural language commands like "generate a sunset image in watercolor style and animate it" and routes to the appropriate pipeline combination.

**n8n has native MCP support through two nodes.** The MCP Client Tool node connects n8n's AI agents to your existing MCP servers (configure the SSE endpoint URL). The MCP Server Trigger node exposes n8n workflows as tools that Claude Code can discover and call. This means Claude Code can trigger your n8n pipelines directly, and n8n's AI agent can access your Supabase, memory, and jobs MCP servers — **full bidirectional integration with your existing Claude Code ecosystem**.

Install `n8n-MCP` (`github.com/czlonkowski/n8n-mcp`) to give Claude Code comprehensive knowledge of all 1,084 n8n nodes when building workflows.

---

## Sub-workflows keep complex pipelines manageable

n8n's **Execute Sub-workflow** node is how you compose the multi-pipeline combos (e.g., generate image → animate → overlay brand). Each pipeline is a self-contained sub-workflow with its own trigger:

| Sub-workflow | Trigger | Input | Output |
|---|---|---|---|
| Image Generation | Execute Sub-workflow Trigger | prompt, style, dimensions | Binary image |
| Video Render | Execute Sub-workflow Trigger | compositionId, inputProps | Binary video |
| Template Generation | Execute Sub-workflow Trigger | templateId, data | Binary image/SVG |
| Data Visualization | Execute Sub-workflow Trigger | query, chartType | Binary animated video |
| Brand Overlay | Execute Sub-workflow Trigger | Binary image, overlayConfig | Binary branded image |
| Quality Scoring | Execute Sub-workflow Trigger | Binary image | score (0-100), pass/fail |

The orchestrator workflow chains these: `Image Gen Sub-WF → Quality Scoring Sub-WF → IF score > 70 → Brand Overlay Sub-WF → Telegram Send`. For the multi-pipeline combo, it runs sequentially: `Image Gen → Video Render (with image as input) → Brand Overlay → Telegram Send`.

Right-clicking selected nodes in any workflow offers "Sub-workflow conversion" — which extracts them into a reusable sub-workflow automatically.

---

## n8n vs the alternatives: why n8n wins for this stack

Four alternatives were deeply evaluated. Here's the condensed comparison:

| Factor | n8n | Temporal | Inngest | Windmill | BullMQ |
|---|---|---|---|---|---|
| Visual workflow editor | **★★★★★** | ☆ (monitoring only) | ★★★ (dashboard) | ★★★★★ | ☆ (bull-board) |
| TypeScript integration | ★★★ (JS Code nodes) | ★★★½ (Node.js only) | **★★★★★** | ★★★★ (Bun native) | **★★★★★** |
| Self-hosted simplicity | ★★★★ | ★★ | **★★★★★** | ★★★★ | **★★★★★** |
| Integration ecosystem | **★★★★★** (400+ built-in) | ★★ | ★★ | ★★★ | ★ |
| AI/LLM agent support | **★★★★★** (Claude+MCP) | ★★★★ | **★★★★★** | ★★½ | ☆ |
| Long-running jobs | ★★★½ | **★★★★★** | ★★★★½ | ★★★½ | ★★★★ |
| Durable execution | ★★ (no replay) | **★★★★★** | ★★★★½ | ★★★ | ★★ |
| Setup effort | 30 min | 2-4 hours | 5 min | 1 hour | 30 min + weeks of code |

**n8n wins on the combination that matters most for your use case**: visual pipeline editing + rich built-in integrations (Telegram, Supabase, Anthropic are all native nodes) + MCP support + community nodes for ComfyUI + free unlimited self-hosted usage. No other tool offers all five.

**Where n8n is weaker**: it lacks durable execution (if it crashes mid-workflow, that execution is lost — design for idempotency), its Code nodes run JavaScript not TypeScript, and the visual approach means less code-level control than pure TypeScript solutions.

**If n8n becomes a bottleneck**, the best fallback is **Inngest** for its TypeScript-first DX and trivial self-hosting (`inngest start` — one command, zero dependencies). For visual editing specifically, **Windmill** matches n8n's canvas experience while supporting Bun natively. **Trigger.dev** deserves mention for its proven track record with video/FFmpeg pipelines and CRIU-based checkpoint-resume that eliminates timeouts entirely — one user reported going from 87% to 100% success rate on video pipelines after switching from Temporal.

**Temporal** is overkill here. Its determinism constraints, Node.js-only workers (incompatible with Bun), and lack of visual editor make it a poor fit despite its industry-leading reliability.

---

## Workflow versioning without Enterprise

The Community Edition lacks native Git integration (that's a Business/Enterprise feature). The practical workaround is a cron-based export script:

```bash
#!/bin/bash
# n8n-backup.sh — add to crontab: 0 */6 * * * /path/to/n8n-backup.sh
EXPORT_DIR="./n8n-workflows"
cd "$EXPORT_DIR" || exit 1

# Export all workflows as individual JSON files
docker exec n8n-n8n-1 n8n export:workflow --all --separate --output=/files/workflows
cp -r ./shared-files/workflows/*.json .

# Database backup
docker exec n8n-postgres-1 pg_dump -U n8n n8n > "./db-backup-$(date +%F).sql"

# Git commit
git add .
git commit -m "Auto-backup: $(date +'%Y-%m-%d %H:%M')" 2>/dev/null
git push origin main 2>/dev/null
```

You can also build an n8n workflow that exports itself: Schedule Trigger (daily) → Execute Command (n8n export CLI) → Code Node (format) → GitHub API (commit). Template #5081 on n8n.io provides a bidirectional GitHub sync workflow with timestamp-based conflict resolution.

---

## Credentials and secrets management

n8n encrypts all credentials with **AES encryption** before storing in PostgreSQL. The encryption key is set via `N8N_ENCRYPTION_KEY` in your `.env` file — **back this up**; without it, all stored credentials become unreadable. For a single-developer setup, this built-in encryption is sufficient. External secret stores (HashiCorp Vault, AWS Secrets Manager) require the Enterprise license.

Store your API keys via n8n's Credentials UI: Anthropic API key for Claude, Telegram Bot Token, Supabase connection string, and any other service tokens. These are automatically injected into nodes that reference them, never exposed in workflow JSON exports.

---

## Risk assessment: what breaks and how to fix it

**Risk 1: n8n crashes mid-generation (HIGH IMPACT, MEDIUM PROBABILITY).** n8n has no durable execution replay. If it restarts during a 15-minute Flux generation, that execution is lost. **Mitigation:** Design all pipelines to be idempotent — use unique generation IDs, check for existing outputs before processing, store state in Supabase at each pipeline stage. Add `restart: always` to Docker Compose.

**Risk 2: Memory pressure from concurrent heavy jobs (HIGH IMPACT, LOW PROBABILITY).** ComfyUI (12GB) + Remotion (4GB) + n8n (2GB) + PostgreSQL (0.5GB) + macOS (4GB) = ~22.5GB. Peak concurrent usage could hit 28GB on your 36GB machine. **Mitigation:** `N8N_CONCURRENCY_PRODUCTION_LIMIT=3` prevents n8n from launching too many simultaneous jobs. Design workflows to run ComfyUI and Remotion sequentially, never in parallel.

**Risk 3: Binary data bloat fills disk (MEDIUM IMPACT, MEDIUM PROBABILITY).** Filesystem binary data mode stores all generated images/videos in the n8n Docker volume. **Mitigation:** `EXECUTIONS_DATA_PRUNE=true` with `EXECUTIONS_DATA_MAX_AGE=336` (14 days) auto-prunes. Move final outputs to Supabase Storage or S3 before pruning. Monitor disk usage.

**Risk 4: Webhook registration fails after restart (LOW IMPACT, MEDIUM PROBABILITY).** Community reports occasional webhook re-registration failures. **Mitigation:** Set `WEBHOOK_URL` explicitly. Use the health endpoint `/healthz` in a monitoring check. For Telegram specifically, the bot API's getUpdates polling fallback works if webhooks fail.

**Risk 5: ComfyUI WebSocket complexity (LOW IMPACT, HIGH PROBABILITY).** The HTTP polling pattern adds 10-second latency between status checks. **Mitigation:** Acceptable for a personal system. If latency matters, build a thin middleware that listens on ComfyUI's WebSocket and calls n8n's Wait node resume URL on completion — eliminates polling entirely.

**Risk 6: n8n licensing changes (LOW IMPACT, LOW PROBABILITY).** n8n uses a "Sustainable Use License," not true open source. They could restrict self-hosted features. **Mitigation:** Your use case (personal AI agent ecosystem) is explicitly permitted. Pin to a specific Docker image tag. Inngest or Windmill are viable fallback orchestrators if needed.

---

## Timeline estimate for full implementation

| Phase | Tasks | Effort | Dependencies |
|---|---|---|---|
| **1. Foundation** | Docker Compose setup, PostgreSQL, n8n running locally, basic Telegram trigger | **2-3 hours** | None |
| **2. Bun microservice** | HTTP routes wrapping existing ComfyUI client, Remotion renderer, Satori templates | **4-6 hours** | Phase 1 |
| **3. Image pipeline** | ComfyUI sub-workflow (queue→poll→retrieve), quality scoring node, brand overlay, Telegram preview | **6-8 hours** | Phase 2 |
| **4. Video pipeline** | Remotion render sub-workflow, async polling, MP4/GIF output, Telegram send video | **4-6 hours** | Phase 2 |
| **5. Template pipeline** | Supabase data read → Satori → Sharp compositing sub-workflow | **3-4 hours** | Phase 2 |
| **6. AI agent routing** | Claude AI Agent node setup, MCP Client Tool config, natural language command routing | **4-6 hours** | Phases 3-5 |
| **7. Approval flows** | Telegram inline keyboards, Wait nodes, approval/reject branching | **3-4 hours** | Phase 6 |
| **8. Data viz pipeline** | D3/Recharts → Remotion animated charts sub-workflow | **6-8 hours** | Phase 4 |
| **9. Multi-pipeline combos** | Chained sub-workflows (image → animate → brand), error workflows, monitoring | **4-6 hours** | All above |
| **10. Hardening** | Backup scripts, Git versioning, Prometheus/Grafana, concurrency tuning | **3-4 hours** | All above |
| **Total** | | **~40-55 hours** | ~2-3 weeks part-time |

Phases 1-3 deliver immediate value — you'll have a working "Telegram message → AI image → preview" loop in roughly **one focused weekend**. The AI agent routing in Phase 6 transforms the system from a set of pipelines into an intelligent orchestrator where you message your Telegram bot naturally and it decides which golem pipeline to invoke.

---

## Conclusion: pragmatic orchestration over perfect architecture

n8n's sweet spot is exactly your use case: a senior developer who needs visual pipeline orchestration across heterogeneous tools, with AI agent capabilities, running self-hosted on a single powerful machine. The ecosystem advantage is decisive — **native nodes for Telegram, Supabase, and Anthropic Claude, plus community nodes for ComfyUI and FFmpeg, plus built-in MCP support** means you're writing integration glue for only Remotion (one HTTP wrapper). Every alternative requires building or configuring significantly more from scratch.

The architectural pattern to internalize: **n8n is the brain, not the muscles.** It decides what runs, in what order, with what parameters, and what to do when things fail. Your TypeScript microservice is the muscles — it does the actual heavy compute. This separation means you can swap either layer independently. If n8n's limitations bite you in six months, your Bun microservice endpoints work identically with Inngest or Trigger.dev as the orchestrator. If your TypeScript code changes, n8n workflows stay untouched.

Start with Docker Compose + the image generation pipeline. Ship the first Telegram-to-Flux-to-preview loop this weekend. Iterate from there.