# Phase 6: Golems Update

> [Back to main plan](../README.md)

## Goal

Update the golems monorepo to reference BrainLayer as an external package, update MCP configs, and create a PR on the `feature/zikaron-extraction` branch.

## Tools

- **Code:** Direct edits in golems worktree
- **MCPs:** None

## Steps

1. Switch back to golems worktree (`/Users/etanheyman/worktrees/golems/feature/zikaron-extraction`)
2. Update root `CLAUDE.md`:
   - Packages table: zikaron row -> reference BrainLayer as external dependency
   - MCP servers table: `zikaron-mcp` -> `brainlayer-mcp`
   - Zikaron MCP tools section: update tool names
3. Replace `packages/zikaron/CLAUDE.md` with a short redirect note pointing to `github.com/EtanHey/brainlayer`
4. Update MCP config in `.claude/settings.json` or equivalent: `zikaron` -> `brainlayer`
5. Update `.claude/rules/` files that reference zikaron paths:
   - `docs.local/` paths -> `~/.local/share/brainlayer/storage/{project}/docs.local/`
   - Update "NEVER Save to /tmp/" rule to mention brainlayer storage
6. Update MEMORY.md references to zikaron paths/names
7. Commit all changes
8. Create PR on `feature/zikaron-extraction` branch targeting master

## Depends On

- Phase 5 (needs BrainLayer repo created on GitHub so we can link to it)

## Key Files

```
CLAUDE.md                          # Root monorepo docs
packages/zikaron/CLAUDE.md         # Replace with redirect
.claude/settings.json              # MCP config (if applicable)
.claude/rules/*                    # Auto-loaded rules
```

## Special Notes

- This is the ONLY phase that creates a PR in the golems repo
- All other phases work in the temp extracted repo
- The `packages/zikaron/` source code stays in golems (it's still the active install) -- only CLAUDE.md and references change
- Actual removal of `packages/zikaron/` code from golems happens later when brainlayer is stable and installed via pip

## Status

- [x] Update root CLAUDE.md references
- [x] Replace packages/zikaron/CLAUDE.md with redirect
- [x] Update MCP config (MCP server name stays `zikaron` in .mcp.json for backward compat)
- [x] Update .claude/rules/ references (golems-base.md, kilo-safety.md)
- [x] Update skill files (skills/golem-powers/zikaron/, ralph copy)
- [ ] Update MEMORY.md (auto-memory, not committed)
- [x] Commit changes
- [x] Create PR
