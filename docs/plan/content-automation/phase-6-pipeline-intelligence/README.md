# Phase 6: Pipeline Intelligence

> [Back to main plan](../README.md)

## Goal

Claude automatically routes creative ideas to the best pipeline (or combination of pipelines), and can scaffold new pipelines on demand when nothing fits.

## Tools

- **Research:** gemini — "AI agent routing patterns, tool selection in multi-agent systems 2026"
- **Code:** sonnet — routing logic, pipeline registry, dynamic scaffolding
- **MCPs:** zikaron (learn from past content requests), supabase (pipeline performance data)

## Steps

1. Create pipeline registry: JSON config listing each pipeline's capabilities, input types, output formats
   ```json
   {
     "remotion": { "inputs": ["text", "code", "data"], "outputs": ["mp4", "gif"], "best_for": ["animations", "code demos", "data stories"] },
     "comfyui": { "inputs": ["prompt", "image"], "outputs": ["png", "svg"], "best_for": ["social visuals", "merch", "memes"] },
     "dataviz": { "inputs": ["data_source"], "outputs": ["png", "mp4"], "best_for": ["charts", "infographics"] }
   }
   ```
2. Build routing prompt: Claude analyzes user's idea → matches to best pipeline(s)
3. Multi-pipeline support: some ideas need combo (e.g., ComfyUI background + Remotion text animation)
4. "Create new pipeline" capability: if nothing fits, Claude scaffolds a new workflow
   - Generates n8n workflow JSON from description
   - Adds to registry
   - Runs first attempt
5. Quality scoring: after each render, rate output (automated + user feedback via Telegram reactions)
6. Learning loop: track which pipeline works best for which idea types (Supabase table)
7. Telegram UX: user sends idea → Claude responds "Using [pipeline] because [reason]" → renders → preview

## Depends On

- Phase 2, 3, 5 (all pipelines must exist)
- Phase 4 (n8n must be running for workflow execution)

## Status

- [ ] Pipeline registry JSON
- [ ] Routing prompt / logic
- [ ] Multi-pipeline combination support
- [ ] Dynamic pipeline scaffolding
- [ ] Quality scoring system
- [ ] Learning loop (pipeline performance tracking)
- [ ] Telegram UX for idea → pipeline → preview
