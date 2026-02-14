# Phase 8: Content Pipeline Skills + Dashboard Visualization

> [Back to main plan](../README.md)

## Goal
Make content pipelines usable via CC skills, create n8n as a CC-managed tool, and build a dashboard page that visualizes how each pipeline works with interactive diagrams.

## Architecture (User's Vision)

**Claude Code (Opus) is ALWAYS the brain.** No autonomous AI router API, no Telegram→webhook automation. The user gives the order, CC orchestrates everything.

### How It Works
```
You → cd packages/content && claude
→ "Make me an animated code demo of the golems architecture"
→ CC (Opus) understands intent, picks Remotion pipeline
→ CC modifies React composition if needed
→ CC runs `bun run render ArchDiagram --project golems`
→ Output: mp4 file delivered
```

### Three Trigger Paths
1. **CC Terminal** (primary) — `cd packages/content && claude` → ContentGolem has skills to orchestrate all pipelines. CC is the intelligence.
2. **Dashboard** (visual) — Content page shows available pipelines, their capabilities, recent outputs. User can browse/trigger from the UI (which calls CC or render service).
3. **n8n** (tool, not automation) — CC has an n8n skill to create/manage workflows. n8n handles multi-step orchestration WHEN CC decides to use it. Not autonomous.

### Pipeline Capabilities

| Pipeline | What It Does | AI Involved? | Tool |
|----------|-------------|-------------|------|
| **Remotion** | Video/animation from React compositions | CC writes/picks composition | `bun run render` |
| **ComfyUI/Flux** | Image generation | Local Flux model (GPU) | ComfyUI API |
| **Data Viz** | Charts/infographics from live data | CC designs the chart | SVG builders + sharp |
| **n8n Workflows** | Multi-step orchestration | CC creates workflows | n8n Cloud API |

**Key:** CC can also CREATE new pipelines — write new Remotion compositions, new dataviz templates, new n8n workflows. The skill teaches CC how to use each tool.

## Tools
- **Research:** gemini — n8n Cloud API, Remotion composition patterns
- **Code:** cursor/opus — dashboard content page + CC skills
- **MCPs:** supabase (pipeline_runs)

## Steps

1. **Create content creation CC skill** — A ContentGolem skill that CC uses to: understand the idea, pick the right pipeline, execute it, deliver the output. Wraps Remotion, ComfyUI, dataviz tools.
2. **Create n8n CC skill** — A skill that lets CC interact with n8n Cloud (`etanheyman.app.n8n.cloud`): list workflows, create workflows, trigger runs, check status. n8n is a tool CC uses, not an autonomous system.
3. **Start render microservice** — Create launchd plist for `packages/orchestrator/src/render-service.ts` on port 3001. Always-on local service.
4. **Create `/content/creator` page** — Dashboard page showing: available pipelines with capabilities, recent outputs gallery, pipeline flow diagrams. Can trigger renders via the render service.
5. **Add interactive pipeline flow diagrams** — For each pipeline, show a node+arrow diagram explaining exactly what happens at each step, what tools are used, where CC fits in vs pure code.
6. **Add pipeline execution log** — Live feed of pipeline runs with status, duration, outputs. Links to generated files. Stored in `pipeline_runs` Supabase table.
7. **Test end-to-end** — Use CC with content skill to trigger each pipeline type. Verify output and dashboard tracking.

## Depends On
- Phase 1 (token tracking for CC usage during pipeline execution)
- Phase 3 (service monitoring for render service status)

## Status
- [ ] Content creation CC skill
- [ ] n8n CC skill
- [ ] Start render microservice
- [ ] Content creator dashboard page
- [ ] Interactive pipeline flow diagrams
- [ ] Pipeline execution log
- [ ] End-to-end test
