# Phase 9: Obsidian Brain View

> [Back to main plan](../README.md)

## Goal

Export Zikaron's enriched knowledge graph as Obsidian-compatible markdown notes so you can visually browse your AI brain — sessions as notes, files/PRs/plans as linked nodes, timelines, and graph views.

## Tools

- **Research:** gemini — "Obsidian Dataview queries for knowledge graphs, best vault structure for linked data"
- **Code:** cursor (work mode) — Python exporter in zikaron + Obsidian vault setup
- **Plugins:** Graph View (core), Dataview, Timeline View, Extended Graph

## Obsidian Plugin Stack

| Plugin | Purpose | Install |
|--------|---------|---------|
| **Graph View** (core) | Network visualization of all notes | Built-in |
| [**Dataview**](https://blacksmithgu.github.io/obsidian-dataview/) | SQL-like queries on YAML frontmatter | Community plugin |
| [**Timeline View**](https://github.com/b-camphart/timeline-view) | Chronological ordering by date property | Community plugin |
| [**Extended Graph**](https://www.obsidianstats.com/plugins/extended-graph) | Filter graph by tags, color by metadata | Community plugin |
| [**InfraNodus**](https://infranodus.com/obsidian-plugin) | AI-powered 3D knowledge graph + gap detection | Community plugin |

## Export Structure

```
Obsidian Vault/
├── Zikaron/
│   ├── Sessions/
│   │   ├── 2026-02-11-telegram-fix.md
│   │   ├── 2026-02-10-phase8-plan.md
│   │   └── ...
│   ├── Files/
│   │   ├── telegram-bot.ts.md        ← all sessions that touched this file
│   │   ├── cloud-llm.ts.md
│   │   └── ...
│   ├── PRs/
│   │   ├── PR-112.md
│   │   ├── PR-108.md
│   │   └── ...
│   ├── Plans/
│   │   ├── componentize-golems.md
│   │   ├── local-llm-integration.md
│   │   └── ...
│   ├── Patterns/
│   │   ├── launchd-eaddrinuse-fix.md  ← reusable patterns extracted
│   │   ├── api-key-stripping.md
│   │   └── ...
│   └── Dashboards/
│       ├── Recent Sessions.md         ← Dataview: last 7 days
│       ├── Most Modified Files.md     ← Dataview: by interaction count
│       ├── Bug Timeline.md            ← Timeline: bug-fix sessions
│       └── Knowledge Gaps.md          ← InfraNodus: underexplored areas
```

## Note Templates

### Session Note
```markdown
---
date: 2026-02-11
session_id: abc123
branch: feature/phase8-telegram
pr: 112
plan: componentize-golems
phase: 8
files: [telegram-bot.ts, com.golems.telegram.plist]
tags: [bug-fix, deployment, launchd]
intent: debugging
outcome: success
importance: 8
---

# Telegram Bot EADDRINUSE Fix

## Summary
Fixed crash loop caused by KeepAlive restarting before port releases.

## Operations
1. **Research** — Grepped for EADDRINUSE, found in telegram-bot.ts
2. **Fix** — Added SIGTERM handler calling `server.stop(true)` + `bot.stop()`
3. **Config** — Added `ThrottleInterval: 5` to launchd plist
4. **Test** — Killed process twice, verified port released both times

## Key Decision
[[docs/architecture/launchd-eaddrinuse.md]] — graceful shutdown pattern

## Related
- [[telegram-bot.ts]] — main file modified
- [[PR-112]] — PR for this fix
- [[componentize-golems]] Phase 8
- Previous: [[2026-02-07-telegram-composers]] — last session touching this file
```

### File Note
```markdown
---
file: packages/claude/src/telegram-bot.ts
interactions: 14
last_modified: 2026-02-11
tags: [telegram, bot, core]
---

# telegram-bot.ts

## Interaction Timeline
```dataview
TABLE date, intent, outcome, pr
FROM "Zikaron/Sessions"
WHERE contains(files, "telegram-bot.ts")
SORT date DESC
```

## Regression Risk
Last successful session: [[2026-02-11-telegram-fix]]
Changes since: none (stable)
```

### Dashboard: Recent Sessions
```markdown
# Recent Sessions

```dataview
TABLE date, intent, outcome, plan, tags
FROM "Zikaron/Sessions"
WHERE date >= date(today) - dur(7 days)
SORT date DESC
```
```

## Steps

1. Create `zikaron export-obsidian` CLI command:
   - Reads enriched chunks + session context + file interactions
   - Generates markdown notes with YAML frontmatter
   - Creates `[[wikilinks]]` for cross-references
   - Idempotent: re-running updates existing notes
2. Configure Obsidian vault path (use existing vault or create `~/.golems-brain/`)
3. Set up Obsidian vault structure (folders above)
4. Install plugins: Dataview, Timeline View, Extended Graph
5. Create Dataview dashboard queries
6. Create file interaction notes with embedded Dataview queries
7. Create PR notes linking to sessions + files
8. Create plan notes linking to phases + sessions
9. Extract reusable patterns into Patterns/ folder
10. Add to daily 5 AM pipeline: `zikaron export-obsidian --since yesterday`
11. Test: open vault, verify graph shows meaningful connections
12. Test: Dataview queries return useful results
13. Test: Timeline View shows file interaction history correctly

## Obsidian Vault Config

```json
// .obsidian/community-plugins.json
["dataview", "timeline-view", "extended-graph"]

// .obsidian/graph.json — color nodes by type
{
  "colorGroups": [
    {"query": "path:Sessions", "color": {"a": 1, "rgb": 5046016}},
    {"query": "path:Files", "color": {"a": 1, "rgb": 52224}},
    {"query": "path:PRs", "color": {"a": 1, "rgb": 16744448}},
    {"query": "path:Plans", "color": {"a": 1, "rgb": 10040064}}
  ]
}
```

## Depends On

- Phase 5 (enriched chunks exist)
- Phase 8 (knowledge graph with operations, git overlay, timelines)

## Status

- [ ] Create `zikaron export-obsidian` command
- [ ] Configure vault path
- [ ] Set up folder structure
- [ ] Install Obsidian plugins
- [ ] Generate session notes
- [ ] Generate file notes with Dataview
- [ ] Generate PR notes
- [ ] Generate plan notes
- [ ] Extract patterns
- [ ] Add to 5 AM pipeline
- [ ] Test graph visualization
- [ ] Test Dataview queries
- [ ] Test timeline views
