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
│   └── remotion/                # Remotion animation components
├── projects/                    # Per-project brand configs (outputs gitignored)
│   ├── golems-showcase/         # brand.json + templates/ + outputs/
│   ├── techgym-posts/           # brand.json + templates/ + outputs/
│   └── political-merch/         # brand.json + templates/ + outputs/
├── scripts/
│   └── validate-brand.ts        # CLI: bun run validate-brand [project]
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
