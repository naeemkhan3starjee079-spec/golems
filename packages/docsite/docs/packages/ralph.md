---
title: "Ralph — Autonomous Coding Loop"
description: "PRD execution engine that reads stories, implements them with Claude Code, reviews with CodeRabbit, and commits."
---

# Ralph

> Autonomous AI coding loop — reads PRDs, implements stories, reviews, commits, and creates PRs.

## What It Does

Ralph is an **autonomous coding engine** built in Zsh. It reads Product Requirement Documents (PRDs), spawns fresh Claude Code sessions for each story, implements the changes, runs CodeRabbit review, and commits on success. It's how most of the Golems ecosystem was built.

## Core Loop

```
while stories remain:
  spawn fresh Claude Code session
  read story from prd-json/
  implement all acceptance criteria
  run CodeRabbit review
  if review passes: commit
  if review fails: create BUG story
done
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `ralph N` | Run N story iterations |
| `ralph -G` | Use Gemini mode |
| `ralph -ui` | Launch React Ink dashboard |
| `ralph --prd path/` | Use a specific PRD directory |

## Skills Library

Ralph manages 30+ reusable Claude Code skills in `skills/golem-powers/`. These are installable as Claude Code plugins and cover:

- **Development:** commit, create-pr, worktrees, test-plan, lsp
- **Operations:** railway, 1password, convex, github
- **Content:** linkedin-post, content, writing-skills
- **Research:** context7, github-research, cli-agents
- **Quality:** coderabbit, critique-waves, pr-comments
- **Memory:** zikaron, catchup, learn-mistake

See the [Skills Library](/golems/docs/skills) page for the full catalog.

## PRD Format

Stories are JSON files with structured acceptance criteria:

```json
{
  "id": "US-001",
  "title": "Add email scoring",
  "criteria": [
    { "text": "Score emails 1-10 using LLM", "files": ["src/email/scorer.ts"] },
    { "text": "Run CodeRabbit review - must pass" },
    { "text": "Commit: feat: US-001 add email scoring" }
  ]
}
```

Every story's last two criteria are always:
1. CodeRabbit review (must pass)
2. Commit with conventional message

## Architecture

```
packages/ralph/
├── ralph.zsh              # Main entry point — ALL commands
├── lib/                   # Modular zsh library
├── ralph-ui/              # React Ink terminal dashboard
├── bun/                   # TypeScript story management
├── skills/golem-powers/   # 30+ Claude Code skills
├── rules-library/         # Exportable rules/context library
└── prd-json/              # PRD story files
```

## What Ralph Built

Ralph was responsible for landing 259+ PRs with 497+ commits and 40,000+ lines of code — all written by Claude Code, orchestrated by Ralph's autonomous loop.

## Source

[`packages/ralph/`](https://github.com/EtanHey/golems/tree/master/packages/ralph)
