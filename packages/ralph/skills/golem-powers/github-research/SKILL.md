---
name: github-research
description: Use when auditing codebases, understanding new project architecture, or finding configuration gaps. Covers repo exploration, function discovery, documentation gaps. NOT for: GitHub PRs/issues (use github skill).
---

# GitHub Research

## Research Protocol

1. **Structure Discovery:** `tree -L 2`, find config files, check for monorepo
2. **Entry Points:** Read package.json scripts/main/bin, find index.ts files
3. **Key Files:** Always read README.md, CLAUDE.md, package.json, main entry
4. **Function Discovery:** Grep for `export function`, shell functions, CLI commands
5. **Cross-References:** Check git remotes, workspace refs, local path deps

## Output Format

Create structured findings in `docs.local/`:
```
docs.local/
├── {project}-structure.md
├── {project}-commands.md
├── {project}-config-issues.md
└── {project}-gaps.md
```

## Multi-Pass Pattern

1. Structure discovery (tree, find)
2. Read key files (README, package.json)
3. Function/command extraction (grep)
4. Cross-reference with docs (find gaps)
5. Verify findings
