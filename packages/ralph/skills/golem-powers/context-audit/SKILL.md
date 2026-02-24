---
name: context-audit
description: Use to diagnose missing rules/contexts in a project. Compares what rules SHOULD be loaded vs what IS loaded. Covers .claude/rules/ check, context gaps, setup audit. NOT for: listing skills (use /skills), detecting tools (use /project-context).
user-invocable: true
---

# Context Audit

Diagnoses what rules/contexts a project SHOULD have vs what it currently HAS.

## Quick Audit

```bash
bash ~/.claude/commands/golem-powers/context-audit/scripts/audit.sh
```

## What This Audits

1. **Auto-loaded rules** - What's in `.claude/rules/` (auto-loaded by Claude Code)
2. **Available contexts** - What's in `rules-library/` (exportable reference library)
3. **Project tech stack** - Detected from package.json, file patterns
4. **Gap analysis** - What's missing

## Manual Audit Steps

### Step 1: Check Auto-Loaded Rules

```bash
# Rules in current repo (auto-loaded):
ls .claude/rules/*.md 2>/dev/null || echo "No .claude/rules/ found"
```

### Step 2: Check Exportable Contexts

```bash
# Master context library (for export to other projects):
ls rules-library/*.md rules-library/**/*.md 2>/dev/null || echo "No rules-library/ found"
```

### Step 3: Detect Project Needs

| If Project Has | Should Have Rule/Context |
|----------------|------------------------|
| Any golems work | `.claude/rules/golems-base.md` |
| Ralph/PRD work | `.claude/rules/ralph-workflow.md` |
| Ink CLI (ralph-ui) | `.claude/rules/tech-ink.md` |
| Next.js | `rules-library/tech/nextjs.md` (export to project) |
| React Native/Expo | `rules-library/tech/react-native.md` (export) |
| Convex | `rules-library/tech/convex.md` (export) |
| Supabase | `rules-library/tech/supabase.md` (export) |
| Hebrew/Arabic UI | `rules-library/workflow/rtl.md` (export) |

### Step 4: Report Gaps

Compare needed vs has. Missing = gap.

## Two Systems

| System | Location | Loading | Purpose |
|--------|----------|---------|---------|
| **Rules** | `.claude/rules/` | Auto-loaded by Claude Code | Repo-specific, survives compaction |
| **Contexts** | `rules-library/` | Manual reference / export | Reusable library for any project |

## Self-Improvement Loop

If you find gaps:
1. Fix immediately if it's a simple rules file addition
2. Create a PRD story with `/golem-powers:prd` if it's systemic
3. For other projects: copy relevant contexts to their `.claude/rules/`
