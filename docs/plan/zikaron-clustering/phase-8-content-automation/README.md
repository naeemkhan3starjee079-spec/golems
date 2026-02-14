# Phase 8: Content Automation Hooks

> [Back to main plan](../README.md)

## Goal

Connect cluster hierarchy to the content automation pipeline (n8n, Remotion, ComfyUI) for intelligent topic selection and content suggestions.

## Tools
- **Code:** FastAPI endpoints, n8n HTTP Request nodes
- **Integration:** Content automation plan Phase 6 (pipeline intelligence)

## Steps

1. **FastAPI content API** — 5 endpoints matching MCP tools:
   - `GET /api/suggest-content?type=all`
   - `GET /api/expert-topics?min_chunks=50`
   - `GET /api/clusters?level=0`
   - `GET /api/cluster/{id}`
   - `POST /api/find-clusters` (semantic search)
2. **n8n workflow: Weekly content suggestions**
   - Schedule Trigger (Monday 9am) → HTTP Request → Code Node (format) → Telegram
3. **n8n workflow: Topic-based pipeline routing**
   - Webhook receives content idea → query clusters → pick pipeline based on topic type
   - Code topics → data viz pipeline
   - Visual topics → Flux/ComfyUI pipeline
   - Explainer topics → Remotion animation pipeline
4. **Expertise scoring** for "authority content" suggestions
5. **Cross-source detection** — WhatsApp discussions linked to code sessions via shared clusters
6. Wire `suggest_content_topics` into content automation Phase 6 pipeline intelligence

## Content Suggestion Categories

| Category | Signal | Example |
|----------|--------|---------|
| Authority | >50 chunks, high cohesion, multi-source | "Write a guide on TypeScript monorepo patterns" |
| Timely | Chunk velocity spike (>5× 30-day avg) | "Railway deployment activity surged — share your setup" |
| Unique angles | High betweenness centrality (bridges clusters) | "You connected Telegram bots with real-estate scraping" |
| Content gaps | High query frequency, low chunk count | "You search for X but haven't documented it" |

## Depends On
- Phase 6 (MCP tools / FastAPI endpoints)
- Content automation plan Phase 4 (n8n running)

## Status
- [ ] FastAPI content API
- [ ] n8n weekly suggestions workflow
- [ ] n8n pipeline routing workflow
- [ ] Expertise scoring query
- [ ] Cross-source detection
- [ ] Wire into content automation
