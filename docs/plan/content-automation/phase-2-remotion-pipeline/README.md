# Phase 2: Remotion Animation Pipeline

> [Back to main plan](../README.md)

## Goal

Turn the existing Remotion scaffold (PR #153) into a working animation render pipeline with brand-aware templates and a Figma-to-Remotion iterative refinement loop.

## Tools

- **Research:** gemini — "Remotion programmatic video templates best practices 2026", context7 for Remotion docs
- **Code:** cursor — Remotion components, render pipeline, Figma comparison loop
- **MCPs:** zikaron (check past Remotion work)

## Key Patterns (from golems-content pipeline)

The Figma-to-Remotion pipeline (`golems-content/packages/content/remotion/`) established a proven iterative refinement loop:

1. **Capture Figma design** via Figma MCP (`get_screenshot`, `get_design_context`)
2. **Build pure React/SVG components** — zero raster images, hyper-realistic
3. **Iterative comparison loop:** render still → compare to Figma → fix top 3 differences → repeat
4. **CLI agent automation:** Cursor/Codex as visual QA agent for the comparison step
5. **Animation verification:** check multiple frames (30, 60, 120, 180, 210) for entrance + ambient motion

This pattern should be generalized into a reusable pipeline for all content projects.

## Steps

1. **Audit existing `packages/content/remotion/` scaffold** — what's there from PR #153, what's missing
2. **Audit `golems-content/packages/content/remotion/`** — extract reusable patterns from the Figma-to-Remotion pipeline (component tree structure, animation helpers, comparison loop)
3. **Create render pipeline:** input config (text, data, brand.json) → Remotion render → MP4/GIF output
4. **Build animation helper library** (from golems-content patterns):
   - `springProgress(frame, fps, preset, delay)` — spring entrance
   - `clampedInterpolate(frame, inputRange, outputRange)` — fade/slide
   - Continuous float with `entranceFactor` blend-in
5. **Build first template: "code showcase"** — syntax-highlighted code with animations, terminal output
6. **Build second template: "architecture diagram"** — animated boxes/arrows showing system flow
7. **Build third template: "Figma-to-Remotion"** — generalized version of the iterative refinement pipeline:
   - Input: Figma URL (fileKey + nodeId)
   - Figma MCP captures screenshot + design context
   - Component scaffolding from design structure (layers → React components)
   - Iterative comparison loop (`remotion still` → compare → fix → repeat)
   - CLI agent prompt template for automated visual QA
   - Final render when converged
8. **Create CLI command:** `golems content render <project> <template> [--preview]`
9. **Wire Telegram preview:** render → upload to Telegram → wait for approval
10. **Test with golems-showcase brand.json** — render a real animation
11. **Add render queue:** handle multiple render requests without blocking
12. **Expose HTTP API** for n8n integration (Phase 4):
    - `POST /api/remotion/render` → accepts compositionId + inputProps, returns job ID
    - `GET /api/remotion/status/:id` → poll render progress
    - `GET /api/remotion/output/:id` → retrieve rendered file

## Key Techniques (from golems-content)

### Pure React "Photos" (zero raster images)
- Rooms: colored rectangles with gradients
- Furniture: rounded rectangles with layers
- Windows: rectangle + inner gradient + dividers
- Shadows: lower-opacity offset duplicates

### Hyper-Realistic SVG
- 3D gradients: `linearGradient` + `radialGradient` with multiple stops
- Specular highlights: small white ellipses, low opacity
- Glass effects: near-zero opacity fill + edge refraction
- Metallic: alternating light/dark gradient stops

### Font Integration
1. Copy fonts to `public/fonts/`
2. `@font-face` in `style.css` with relative paths: `../public/fonts/Font.otf`
3. Reference: `fontFamily: "FontName, sans-serif"`

## Depends On

- Phase 1 (brand.json schema — templates read brand config)

## Status

- [ ] Audit existing Remotion scaffold (PR #153)
- [ ] Audit golems-content Figma-to-Remotion pipeline
- [ ] Build render pipeline (input → render → output)
- [ ] Build animation helper library
- [ ] Create "code showcase" template
- [ ] Create "architecture diagram" template
- [ ] Create "Figma-to-Remotion" generalized pipeline
- [ ] CLI command for rendering
- [ ] Telegram preview integration
- [ ] Test with real brand config
- [ ] Render queue for multiple requests
- [ ] HTTP API for n8n integration
