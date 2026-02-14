# Content Automation

> Visual content factory — n8n orchestrated, free/local-first, multi-pipeline.
> You throw in an idea, Claude picks the right pipeline (or creates one), renders it locally, sends to Telegram for preview. You publish when ready.

**Created:** 2026-02-13
**Status:** Planning complete — all deep research incorporated, ready for execution

---

## Principles

1. **Visual creation, not text** — User writes text. ContentGolem creates animations, images, data viz, branded visuals.
2. **Free/local-first** — Flux, Remotion, ComfyUI. No paid APIs. Quality over speed.
3. **Never auto-publish** — Telegram preview only. User publishes manually.
4. **Per-project brand rules** — Centralized schema, each project has own brand.json, templates, outputs.
5. **Pipeline intelligence** — Claude routes ideas to the best pipeline, or creates a new one.
6. **Iterative quality** — Figma-to-Remotion comparison loops, quality scoring gates, multi-pass refinement.

---

## Progress

| # | Phase | Folder | Status | Notes |
|---|-------|--------|--------|-------|
| 1 | Brand System + Project Schema | [phase-1-brand-system](phase-1-brand-system/) | done | Schema, validator, 3 project configs |
| 2 | Remotion Animation Pipeline | [phase-2-remotion-pipeline](phase-2-remotion-pipeline/) | done | 4 templates, render service, CLI, multi-platform (PR #159) |
| 3 | Flux/ComfyUI Image Generation | [phase-3-flux-comfyui](phase-3-flux-comfyui/) | done | ComfyUI + models + TS client + quality pipeline + CLI (PR #160) |
| 4 | n8n Orchestration Layer | [phase-4-n8n-orchestration](phase-4-n8n-orchestration/) | in PR | Orchestrator pkg, render service, workflow templates, Docker Compose |
| 5 | Data Visualization Pipeline | [phase-5-data-viz](phase-5-data-viz/) | pending | Charts/graphs from golem data |
| 6 | Pipeline Intelligence | [phase-6-pipeline-intelligence](phase-6-pipeline-intelligence/) | pending | Claude auto-routes ideas |
| 7 | Dashboard Integration | [phase-7-dashboard-integration](phase-7-dashboard-integration/) | pending | Content tab in Ops Dashboard |

---

## Architecture

```text
User (idea via Telegram or CLI)
  → n8n ORCHESTRATOR (Docker, port 5678)
    → AI Agent (Claude) picks pipeline
      → BUN MICROSERVICE (host, port 3001)
        → Pipeline: Remotion | Flux/ComfyUI | Satori/Sharp | Data Viz | Figma-to-Remotion
          → Output: MP4 / GIF / PNG / SVG / high-res design
            → Quality scoring (LAION + CLIP + BRISQUE)
              → Telegram preview (never auto-publish)
                → User approves → post-processing → publish
```

### Pipelines

| Pipeline | Backend | Output | Use Case |
|----------|---------|--------|----------|
| **Animation** | Remotion (local) | MP4, GIF | Code demos, motion graphics, video content |
| **Image Gen** | Flux Q6_K via ComfyUI (local) | PNG | Social visuals, merch designs, memes |
| **Template Fill** | Satori (~50ms) + Sharp (local) | PNG, SVG, PDF | Branded templates with dynamic text/data (80% of work) |
| **Data Viz** | D3/Recharts → Remotion | MP4, PNG | Charts from golem data (jobs, finance, brain) |
| **Figma-to-Remotion** | Figma MCP → React/SVG → Remotion | MP4 | Hyper-realistic animated compositions from designs |
| **Multi-Pipeline** | Chained: e.g., Flux → Remotion → brand | Varies | Complex combos routed by AI |

### Per-Project Structure

```text
content-projects/                    # Private repo or gitignored
├── schema.json                      # Centralized schema all projects follow
├── golems-showcase/
│   ├── brand.json                   # Colors, fonts, logo, tone
│   ├── templates/                   # Remotion/image templates
│   └── outputs/                     # Generated content (gitignored)
├── techgym-posts/
│   ├── brand.json
│   └── templates/
├── political-merch/
│   ├── brand.json
│   └── templates/
└── job-market-insights/
    ├── brand.json
    └── templates/
```

---

## Dependencies

- `packages/content/remotion/` — already scaffolded (PR #153)
- `packages/content/CLAUDE.md` — content golem config
- `packages/orchestrator/` — n8n Docker Compose + Bun render service (Phase 4)
- `golems-content/packages/content/remotion/` — Figma-to-Remotion pipeline patterns (external repo)

---

## Execution Rules

Each phase = one branch = one PR. See `/large-plan` skill for the full protocol.

**Research-first:** Every phase starts with research via CLI helpers (Gemini, Cursor) before implementation. The phase README specifies which helper does what.

**Sequential:** Phases execute in order. Don't skip ahead.

---

## Resolved Questions (from deep research)

- [x] **Orchestrator:** n8n — visual builder + 400+ integrations + native MCP + AI Agent with Claude
- [x] **Flux model:** Flux.1 Dev Q6_K GGUF (~8.6 GB) — best for 32GB M1 Pro, GGUF only (FP8/NF4 broken on MPS)
- [x] **n8n hosting:** Start n8n Cloud → migrate to self-hosted Railway (~$5/mo)
- [x] **MCP integration:** Bidirectional — MCP Client Tool + MCP Server Trigger
- [x] **Quality pipeline:** LAION Aesthetic >=5.5, CLIP Score >=0.25, BRISQUE <=40, auto-retry 3x
- [x] **Upscaling:** Real-ESRGAN ncnn-vulkan (native Apple Silicon GPU), 4x-UltraSharp model
- [x] **Non-AI dominates:** Satori (50ms) handles majority of templated content — reserve Flux for generative AI only

## Open Questions

- [ ] Pipeline versioning: track which template/model produced which output? (Supabase metadata table)
- [ ] Figma MCP: free tier limits? Penpot (self-hosted) as alternative?

---

## Cross-Phase Knowledge

Update this section as phases complete:
- Brand schema design → phase-1-brand-system/findings.md
- Remotion template patterns → phase-2-remotion-pipeline/findings.md
- ComfyUI API integration → phase-3-flux-comfyui/findings.md ✅
- n8n architecture decisions → phase-4-n8n-orchestration/findings.md ✅
- Data viz patterns → phase-5-data-viz/findings.md
- Pipeline routing logic → phase-6-pipeline-intelligence/findings.md
