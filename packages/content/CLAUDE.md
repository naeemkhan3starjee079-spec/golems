# ContentGolem

> Content creation — visual content factory + text publishing. Brand-aware, multi-pipeline.

## Role

ContentGolem handles **all content creation and publishing**: visual content (animations, images, data viz), LinkedIn posts, Soltome publishing, ghostwriting, and content strategy. All visual output is brand-aware via per-project `brand.json` configs.

## Architecture

```text
packages/content/
├── src/
│   ├── brand/                   # Brand config schema + validation
│   │   ├── schema.ts            # BrandConfig interface + validator
│   │   └── index.ts             # Barrel export
│   ├── remotion/                # Shared animation components + types
│   │   ├── lib/                 # motion.ts, types.ts, design-tokens.ts, brand-bridge.ts, responsive.ts
│   │   └── components/          # AnimatedText, FadeIn, SlideIn, scenes/, audio/
│   └── render/                  # Programmatic render service
│       ├── render-service.ts    # renderVideo(), renderThumbnail(), job tracking
│       └── index.ts             # Barrel export
├── remotion/                    # Standalone Remotion project (compositions)
│   └── src/
│       ├── Root.tsx             # All registered compositions
│       └── compositions/        # DomicaHero, CodeShowcase, ArchDiagram, MetricsDashboard, ProductHero
├── projects/                    # Per-project brand configs (outputs gitignored)
│   ├── golems-showcase/         # brand.json + templates/ + outputs/
│   ├── techgym-posts/           # brand.json + templates/ + outputs/
│   └── political-merch/         # brand.json + templates/ + outputs/
├── scripts/
│   ├── validate-brand.ts        # CLI: bun run validate-brand [project]
│   └── render.ts                # CLI: bun run render <compositionId> [--project <name>]
├── CLAUDE.md                    # This file
└── package.json                 # @golems/content
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM

## Brand System

**ALWAYS read the project's `brand.json` before generating any visual content.**

```typescript
import { loadBrandConfig } from "@golems/content/brand";

const { config, errors } = await loadBrandConfig("projects/golems-showcase");
if (errors.length > 0) throw new Error(`Invalid brand config: ${errors.map(e => e.message).join(", ")}`);

// Use config.colors, config.typography, config.tone, etc.
```

| Project | Use Case | Brand File |
|---------|----------|------------|
| `golems-showcase` | Product demos, architecture viz, feature showcases | `projects/golems-showcase/brand.json` |
| `techgym-posts` | Israeli tech community content (Hebrew-first) | `projects/techgym-posts/brand.json` |
| `political-merch` | Bold merch designs (t-shirts, stickers) | `projects/political-merch/brand.json` |

Validate all configs: `bun run validate-brand` (runs from packages/content/).

## Remotion Render Pipeline

### Compositions

| ID | What | Default Size |
|----|------|-------------|
| `DomicaHero` | Domica real estate hero with 3D magnifying glass | 1920x700 |
| `CodeShowcase` | Animated code walkthrough with syntax highlighting | 1920x1080 |
| `ArchDiagram` | Animated architecture diagram (boxes + arrows) | 1920x1080 |
| `MetricsDashboard` | Animated stats with count-up, trends, sparklines | 1920x1080 |
| `ProductHero` | Scene sequencer (title → screenshots → metrics) | 1920x1080 |

All compositions (except DomicaHero) have `-LinkedIn` (1080x1080) variants.
MetricsDashboard also has a `-GIF` (800x450) variant.

### Render Commands

```bash
# List available compositions and projects
bun run render:list

# Render a composition (YouTube 1080p by default)
bun run render CodeShowcase --project golems-showcase

# Render for LinkedIn (1:1)
bun run render MetricsDashboard --project golems-showcase --platform linkedin

# Render a still/thumbnail
bun run render:still ArchDiagram --frame 90

# Open Remotion Studio for visual preview
bun run render:preview
bun run studio  # shortcut — opens Studio directly
```

### Programmatic Rendering

```typescript
import { renderVideo, buildBrandProps } from "@golems/content/render";

const brand = await buildBrandProps("projects/golems-showcase");
const job = await renderVideo({
  compositionId: "CodeShowcase",
  inputProps: { ...brand },
  outputPath: "out/code-showcase.mp4",
  onProgress: (p) => console.log(`${p}%`),
});
```

### Brand Bridge

Converts Phase 1 `BrandConfig` → Remotion's `BrandColors`:

```typescript
import { brandConfigToColors } from "@golems/content/remotion/lib/brand-bridge";
const colors = brandConfigToColors(config);
// → { primary, primaryDark, background, surface, text, textMuted, accent }
```

## Current State

ContentGolem's logic currently lives in:
- **`golem-powers/content/`** skill — draft workflow (draft → critique → refine → publish)
- **`golem-powers/linkedin-post/`** skill — LinkedIn-specific drafting with 2026 algorithm rules
- **Soltome client** — `@golems/services/soltome-client.ts` (API client for soltome.com)
- **Post generator** — `@golems/services/post-generator.ts` (critique-waves pattern)
- **Soltome learner** — `@golems/services/soltome-learner.ts` (2am: scrape + learn patterns)

These will migrate into `src/` in a future phase.

## Content Pipeline

1. **Topic Discovery** — from code commits, research, conversations
2. **Drafting** — LLM generates draft matching owner's voice
3. **Critique Waves** — parallel agents critique → refine → polish
4. **Approval** — human approves via Telegram `/drafts` command
5. **Publishing** — post to Soltome (2 credits) or LinkedIn

## Writing Voice

See `~/.claude/learnings/hebrew-tech-ghostwriting.md` for Hebrew voice guidelines.
Key traits: casual, technical depth without jargon, collaborative researcher tone.

## Soltome Integration

| Endpoint | Cost | Description |
|----------|------|-------------|
| `POST /api/posts` | 2 credits | Create post |
| `POST /api/votes` | 1 credit | Vote on post |
| `POST /api/comments` | 1 credit | Comment on post |
| `GET /api/credits/balance` | FREE | Check balance |
