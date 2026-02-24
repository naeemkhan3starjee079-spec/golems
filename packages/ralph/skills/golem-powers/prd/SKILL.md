---
name: prd
description: Use when planning a feature, starting a new project, or asked to create a PRD. Generates JSON-based PRD for Ralph. Adding stories uses update.json pattern. Covers PRD, create PRD, plan feature, Ralph stories. NOT for: running Ralph (user runs externally).
---

# PRD Generator

Create PRDs for autonomous AI implementation via Ralph loop.

## The Job

1. Ask 3-5 clarifying questions (use `AskUserQuestion` tool)
2. Find git root: `git rev-parse --show-toplevel`
3. Discover relevant skills for this project (check package.json, convex.json, .linear, etc.)
4. Create `prd-json/index.json` + `prd-json/stories/{ID}.json` per story
5. Create `prd-json/AGENTS.md` with relevant skills table
6. Create `progress.txt` at git root
7. **STOP and say: "PRD ready. Run Ralph to execute."**

**DO NOT IMPLEMENT** — Ralph handles that externally.

## Story Rules

### Sizing (THE NUMBER ONE RULE)
Each story must complete in ONE context window (~10 min of AI work).

**Right-sized:** Add one component, update one action, fix one bug
**Too big (split):** "Build dashboard" → Schema + Queries + UI + Filters

### Ordering
1. Schema/database → 2. Server actions → 3. UI components → 4. Verification (V-XXX)

### Mandatory Last Two Criteria (EVERY story)
1. `"Run CodeRabbit review - must pass (or create BUG if unfixable)"`
2. `"Commit: {type}: {STORY-ID} {description}"`

CodeRabbit ALWAYS comes BEFORE commit. No exceptions.

### TDD
New functions/helpers → add unit test. Bug fixes → add regression test. Refactors → verify existing tests pass.

### Commit Types
`feat:` (US-XXX) | `fix:` (BUG-XXX) | `test:` (V-XXX, TEST-XXX) | `refactor:`/`chore:` (MP-XXX) | `docs:` (AUDIT-XXX)

## Adding to Existing PRD

**NEVER edit `index.json` directly!** Use `prd-json/update.json`:

```json
{
  "storyOrder": ["...existing...", "US-034"],
  "pending": ["...existing...", "US-034"]
}
```

Do NOT include `stats` — computed automatically. Ralph merges update.json → index.json on next run.

## JSON Templates

### index.json
```json
{
  "storyOrder": ["US-001", "US-002", "V-001"],
  "pending": ["US-001", "US-002", "V-001"],
  "blocked": []
}
```

### Story (prd-json/stories/US-XXX.json)
```json
{
  "id": "US-001",
  "title": "[Story Title]",
  "description": "[What and why]",
  "acceptanceCriteria": [
    {"text": "[Specific criterion]", "checked": false},
    {"text": "Typecheck passes", "checked": false},
    {"text": "Run CodeRabbit review - must pass (or create BUG if unfixable)", "checked": false},
    {"text": "Commit: feat: US-001 [description]", "checked": false}
  ],
  "passes": false,
  "blockedBy": null
}
```

## Conditional Rules

- **RTL projects:** Read `~/.config/ralphtools/configs/rtl-rules.json`
- **Modals/dynamic states:** Read `~/.config/ralphtools/configs/modal-rules.json` — each state = separate story
