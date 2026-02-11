# Golems Base Rules

> Auto-loaded for all Claude sessions in the golems monorepo.

## AIDEV-NOTE Guidelines

Use `AIDEV-NOTE:`, `AIDEV-TODO:`, or `AIDEV-QUESTION:` (all-caps prefix) for comments aimed at AI and developers.

- **Before scanning files**: Grep for existing `AIDEV-*` anchors in relevant subdirectories
- **Update relevant anchors** when modifying associated code
- **Never remove** AIDEV-NOTEs without explicit human instruction

```typescript
// AIDEV-NOTE: This function handles X because of Y constraint
// AIDEV-TODO: Refactor when Z is implemented
// AIDEV-QUESTION: Should we handle edge case W?
```

## SVG and Icon Rules

- **NEVER make SVGs** - use `lucide-react` (web) or `lucide-react-native` (mobile)
- Only create custom SVGs if 100% certain you need to
- **NEVER use**: MaterialCommunityIcons, @expo/vector-icons, or other icon libraries

## TypeScript Safety

**NEVER USE NON-NULL ASSERTIONS WITHOUT VALIDATION**

```typescript
// NEVER: const key = process.env.API_KEY!;
// ALWAYS:
const key = process.env.API_KEY;
if (!key) throw new Error('API_KEY environment variable is required');
```

- Always validate external data (env vars, API responses, user input)
- Use TypeScript strict mode, never bypass with assertions
- Prefer explicit error handling over assumptions

## Spawning Other Claudes

**Don't spawn raw `claude` CLI from within Claude sessions.**
- Use proper scripts (night-shift.ts, ralph.zsh) that handle lifecycle

**Worktree setup for spawned Claudes:**
- Link node_modules: `ln -s ../node_modules node_modules`
- Copy .env: `cp ../.env .env`
- Verify branch: `git branch` (must NOT be master/main)

## Architecture Decisions

When making architecture decisions in this repo:
1. Document the decision in `docs/architecture/` as a markdown file
2. Include: context, options considered, decision, rationale
3. These get indexed into Zikaron for future retrieval
4. Search past decisions: `mcp__zikaron__zikaron_search(query="topic", project="-Users-etanheyman-Gits-golems")`
