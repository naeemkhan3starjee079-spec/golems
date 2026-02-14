# Phase 1: Brand System + Project Schema

> [Back to main plan](../README.md)

## Goal

Create the centralized brand schema and per-project config system that all content pipelines will use.

## Tools

- **Research:** gemini — "best practices for brand.json config systems in content automation 2026"
- **Code:** haiku — schema definition, validation, CLI tooling
- **MCPs:** supabase (optional: store brand configs for dashboard access)

## Steps

1. Design `schema.json` — TypeScript interface for brand configs (colors, fonts, logo, tone, templates)
2. Create first `brand.json` — golems-showcase project with real brand values
3. Build brand validator — `bun run validate-brand <project>` checks config completeness
4. Set up project directory structure in `packages/content/projects/` (gitignored outputs)
5. Wire into ContentGolem CLAUDE.md — "always read brand.json before generating content"
6. Create 2-3 example projects with placeholder brand configs (techgym, political-merch)

## Depends On

- None (foundation phase)

## Status

- [ ] Design schema.json TypeScript interface
- [ ] Create golems-showcase brand.json
- [ ] Build brand config validator
- [ ] Set up project directory structure
- [ ] Wire into ContentGolem context
- [ ] Create example project configs
