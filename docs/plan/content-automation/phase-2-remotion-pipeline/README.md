# Phase 2: Remotion Animation Pipeline

> [Back to main plan](../README.md)

## Goal

Build a complete, brand-aware animation render pipeline on top of the existing Remotion scaffold (PR #153 shared lib + PR #158 DomicaHero). Wire brand.json from Phase 1 into all templates. Add new composition templates and a render service with CLI + HTTP API.

## What Already Exists (DON'T REBUILD)

### Shared Animation Lib (`packages/content/src/remotion/`)
- `lib/motion.ts` — `springProgress`, `clampedInterpolate`, `staggerDelay`, `SPRING_PRESETS`, `DURATIONS`
- `lib/types.ts` — `BrandColors`, `AnimatedHeroProps`, `HeroElement`, `ElementAnimation`, `TextOverlay`
- `lib/design-tokens.ts`, `lib/fonts.ts`, `lib/audio.ts`, `lib/scenes.ts`
- `components/` — `AnimatedText`, `FadeIn`, `FloatLoop`, `ScaleReveal`, `SlideIn`
- `components/audio/` — `BackgroundMusic`, `Narration`, `SoundEffect`
- `components/scenes/` — `MetricsScene`, `ScreenRecordingScene`, `ScreenshotScene`, `TitleCardScene`

### Remotion Project (`packages/content/remotion/`)
- Full project: `package.json` with `remotion`, `@remotion/three`, `three`, `react-three-fiber`
- `src/Root.tsx` — DomicaHero registered (1920x700, 30fps, 300 frames)
- `src/compositions/DomicaHero/` — production composition with:
  - 3D magnifying glass (`@remotion/three` + Three.js)
  - Krea AI-generated apartment interior + Tel Aviv map
  - Pure React property card, search bar, app store badges
  - Hebrew RTL with Ploni fonts
  - `AnimateIn` wrapper with spring physics
  - Floating glass bubbles, stacked skeleton cards for depth
- `remotion.config.ts` — webpack aliases for Domica UI
- Scripts: `studio`, `render`, `still`

### Learnings from DomicaHero (PR #158)
1. **Krea AI** for photorealistic images beats pure SVG — use for backgrounds, product shots
2. **@remotion/three** for 3D elements — glass, metallic, transparent materials
3. **Composition structure:** `compositions/<Name>/<Name>.tsx` + `elements/` subdir
4. **Pure React for UI:** cards, badges, search bars — pixel-perfect without raster images
5. **Hebrew RTL:** `dir="rtl"`, Ploni font family, RTL flex layout
6. **AnimateIn pattern:** reusable entrance wrapper (delay + direction + spring)
7. **Floating physics:** `Math.sin(frame * speed) * amplitude` for gentle ambient motion
8. **Entrance decay:** `Math.exp(-t * 0.04)` for big entrance that settles to subtle idle

### contentGolem Plan (~/Gits/contentGolem → EtanHey/contentGolem)
7-phase plan for ProductHero pipeline. Phases were planned but not executed. Key designs:
- **Phase 3:** Generic `AnimatedHero` template with JSON config presets
- **Phase 4:** Scene components (TitleCard, Screenshot, Metrics, ScreenRecording)
- **Phase 5:** Audio pipeline (TTS, SFX, background music with ducking)
- **Phase 6:** ProductHero composition assembling scenes + audio + transitions
- **Phase 7:** Multi-platform output (YouTube 16:9, LinkedIn 1:1, GIF loops)
- **Deep research:** 15-page technical report on Remotion 2026 best practices

## Tools

- **Research:** context7 for Remotion v4 docs, deep-research.txt from contentGolem
- **Code:** cursor for Remotion components, opus for orchestration
- **Assets:** Krea AI (krea.ai) for photorealistic images, Ploni/Heebo/Inter fonts
- **MCPs:** zikaron (past patterns), supabase (render job tracking)

## Steps

### 2.1 Wire brand.json into Remotion

Bridge the Phase 1 `BrandConfig` type to Remotion's `BrandColors`:
- Create `src/remotion/lib/brand-bridge.ts` — converts `BrandConfig.colors` → `BrandColors`
- Templates read brand.json at render time via `calculateMetadata`
- Fonts loaded dynamically from `brand.typography.*.source`

### 2.2 Build render service (`src/render/`)

The core render pipeline that all templates and CLI/HTTP use:
```
packages/content/src/render/
  render-service.ts    # Core: compositionId + inputProps + brand → MP4/GIF/PNG
  render-queue.ts      # Job queue with status tracking
  index.ts             # Barrel export
```

- `renderVideo(opts)` — calls `@remotion/renderer` programmatically (not CLI)
- `renderStill(opts)` — single frame capture for thumbnails
- Output to `projects/<project>/outputs/`
- Job tracking: id, status (queued/rendering/done/failed), progress %, output path

### 2.3 Create "Code Showcase" template

Animated code walkthrough for technical demos:
```
remotion/src/compositions/CodeShowcase/
  CodeShowcase.tsx       # Main: syntax-highlighted code + terminal
  elements/CodeBlock.tsx # Shiki/Prism highlighted code with line animations
  elements/Terminal.tsx  # Terminal window with typing animation
  elements/Cursor.tsx    # Blinking cursor
```
- Code lines appear with staggered spring entrances
- Highlighted lines glow with brand accent color
- Terminal output types character by character
- Brand colors for syntax theme

### 2.4 Create "Architecture Diagram" template

Animated system diagrams for explaining architecture:
```
remotion/src/compositions/ArchDiagram/
  ArchDiagram.tsx         # Main: boxes + arrows + labels
  elements/DiagramBox.tsx # Rounded rect with icon + label
  elements/Arrow.tsx      # SVG path with `evolvePath()` animation
  elements/DataFlow.tsx   # Animated dots along arrow paths
```
- Boxes spring in from positions
- Arrows draw themselves using `@remotion/paths` `evolvePath()`
- Data flow dots travel along arrow paths
- Labels fade in after their box appears

### 2.5 Create "Metrics Dashboard" template

Animated stats/metrics for social content:
```
remotion/src/compositions/MetricsDashboard/
  MetricsDashboard.tsx     # Main: grid of metric cards
  elements/MetricCard.tsx  # Counter + label + trend indicator
  elements/SparkLine.tsx   # Mini chart drawn with path evolution
```
- Numbers count up with spring overshoot
- Trend arrows animate in (up=green, down=red)
- Sparklines draw from left to right
- Staggered card entrances

### 2.6 Create "Product Hero" template (from contentGolem Phase 6)

Generic product showcase assembling scenes via JSON config:
```
remotion/src/compositions/ProductHero/
  ProductHero.tsx          # Main: scene sequencer with transitions
  schema.ts                # ProductHeroProps (discriminated union)
  transitions/             # Crossfade, SlideLeft, SlideUp
```
- Scenes array: title-card | screenshot | metrics | screen-recording
- `<TransitionSeries>` for smooth scene cuts
- Audio layering: background music + SFX on transitions
- `calculateMetadata` for dynamic duration based on scene count
- Platform presets: YouTube (1920x1080), LinkedIn (1080x1080), GIF (800x450)

### 2.7 Multi-platform rendering

Add platform-aware compositions to Root.tsx:
- `<compositionId>-YouTube` — 1920x1080, 30fps
- `<compositionId>-LinkedIn` — 1080x1080, 30fps
- `<compositionId>-GIF` — 800x450, 15fps
- `useResponsive()` hook for layout adaptation
- Safe zones per platform

### 2.8 CLI command

`bun run packages/content/scripts/render.ts <command>`:
- `render <project> <template> [--platform youtube|linkedin|gif] [--preview]`
- `list` — show available templates and projects
- `preview <project> <template>` — open Remotion Studio

### 2.9 HTTP API for n8n (Phase 4 prep)

Bun.serve() in `src/render/http-server.ts`:
- `POST /render` — queue a render job (compositionId, inputProps, brand)
- `GET /status/:id` — poll render progress
- `GET /output/:id` — download rendered file
- Runs on port 3001 (matches Phase 4 architecture)

### 2.10 Telegram preview

After render completes:
- Upload MP4/GIF to Telegram via bot API
- Caption: project name, template, platform, file size
- User approves or requests changes

### 2.11 Test with golems-showcase brand.json

Render all templates with the golems-showcase brand:
- Code Showcase: show a TypeScript snippet with indigo/cyan theme
- Architecture Diagram: golems monorepo architecture
- Metrics Dashboard: mock golem stats

## Depends On

- Phase 1 (brand.json schema) — DONE

## Status

- [x] Wire brand.json into Remotion (brand-bridge.ts)
- [x] Build render service (programmatic rendering)
- [x] Create "Code Showcase" template
- [x] Create "Architecture Diagram" template
- [x] Create "Metrics Dashboard" template
- [x] Create "Product Hero" template (scene sequencer)
- [x] Multi-platform rendering (YouTube/LinkedIn/GIF)
- [x] CLI command for rendering
- [ ] HTTP API for n8n integration (deferred to Phase 4)
- [ ] Telegram preview integration (deferred to Phase 4)
- [ ] Test with golems-showcase brand config
