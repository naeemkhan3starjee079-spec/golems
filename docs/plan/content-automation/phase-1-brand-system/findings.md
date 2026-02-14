# Phase 1 Findings

## Decisions

- Brand schema uses TypeScript interfaces (not JSON Schema) — validated at runtime via `validateBrandConfig()`
- Schema version field (`$schema: "1.0"`) for forward compatibility
- Per-project structure: `projects/<name>/brand.json` + `templates/` + `outputs/` (outputs gitignored)
- Hebrew-first fonts (Heebo) for techgym-posts; Latin fonts (Inter, Bebas Neue) for others
- Template overrides per content type (animation, image, dataViz) — optional, sensible defaults

## Research

- Gemini: Recommended separating text colors (primary/secondary/onPrimary/onAccent) from surface colors
- Font weights as named records (`{ regular: 400, bold: 700 }`) preferred over arrays for readability
- `source` field on fonts enables auto-loading from Google Fonts or local paths in Remotion

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Design TypeScript schema | opus | done |
| Create golems-showcase brand.json | opus | done |
| Create techgym-posts brand.json | opus | done |
| Create political-merch brand.json | opus | done |
| Build validate-brand CLI | opus | done |
| Update ContentGolem CLAUDE.md | opus | done |
| Set up projects/ directory structure | opus | done |

## Notes

- Color values are CSS hex strings — compatible with Remotion, Satori, D3, and Tailwind
- Voice description field (`tone.voiceDescription`) is a prompt fragment for LLM-based content generation
- Validator is intentionally simple (no external deps like zod/ajv) — just structural checks
- `outputs/` dirs are gitignored but tracked via `.gitkeep` for directory structure preservation
