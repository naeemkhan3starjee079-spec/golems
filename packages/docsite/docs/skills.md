---
title: "Skills Library"
description: "30+ reusable Claude Code skills covering development, operations, content, research, and quality workflows."
---

# Skills Library

> 30+ reusable Claude Code skills. Each skill is a focused workflow you can invoke with `/skill-name` in any Claude Code session.

## What Are Skills?

Skills are Claude Code plugins that provide specialized capabilities. They're stored in `skills/golem-powers/` and can be installed into any project. Each skill has a trigger (slash command), a description, and focused instructions for a specific workflow.

## Skill Categories

### Development

| Skill | Command | What It Does |
|-------|---------|-------------|
| Commit | `/commit` | CodeRabbit review + conventional commit |
| Create PR | `/create-pr` | Draft PR with summary and test plan |
| Worktrees | `/worktrees` | Git worktree management (create, switch, cleanup) |
| Test Plan | `/test-plan` | Generate test plan from requirements |
| LSP | `/lsp` | Code intelligence via Language Server Protocol |
| Ralph Commit | `/ralph-commit` | Atomic commit with story validation |

### Operations

| Skill | Command | What It Does |
|-------|---------|-------------|
| Railway | `/railway` | Deploy, logs, restart, env vars for cloud worker |
| 1Password | `/1password` | Secret management, env migration, vault ops |
| Convex | `/convex` | Schema, deploy, data import/export, troubleshooting |
| GitHub | `/github` | Issues, PRs, checks, releases via `gh` CLI |

### Content

| Skill | Command | What It Does |
|-------|---------|-------------|
| LinkedIn Post | `/linkedin-post` | Topic discovery, drafting, scheduling, review |
| Content | `/content` | Multi-platform content creation and publishing |
| Writing Skills | `/writing-skills` | Create and validate new skills |

### Research & Context

| Skill | Command | What It Does |
|-------|---------|-------------|
| Context7 | `/context7` | Library documentation lookup |
| GitHub Research | `/github-research` | Explore and document repositories |
| CLI Agents | `/cli-agents` | Run Gemini, Cursor, Codex, Kiro for research |
| Zikaron | `/zikaron` | Search past solutions and session context |
| Catchup | `/catchup` | Full branch context recovery |
| Catchup Recent | `/catchup-recent` | Quick context recovery |

### Quality

| Skill | Command | What It Does |
|-------|---------|-------------|
| CodeRabbit | `/coderabbit` | AI code review with multiple workflows |
| Critique Waves | `/critique-waves` | Parallel verification agents for consensus |
| PR Comments | `/pr-comments` | Fetch and display PR review comments |
| Learn Mistake | `/learn-mistake` | Record mistakes for nightly aggregation |

### Domain

| Skill | Command | What It Does |
|-------|---------|-------------|
| Interview Practice | `/interview-practice` | 7-mode practice with Elo tracking |
| Email Golem | `/email-golem` | Email status, manual triage, recent scores |
| Tax Helper | `/tax-helper` | Transaction categorization for Schedule C |
| Obsidian | `/obsidian` | Search, read, write Obsidian vault notes |

### Project Management

| Skill | Command | What It Does |
|-------|---------|-------------|
| PRD | `/prd` | Generate Product Requirement Documents |
| PRD Manager | `/prd-manager` | Manage PRD stories and status |
| Large Plan | `/large-plan` | Multi-phase plan scaffolding and execution |
| Archive | `/archive` | Archive completed PRD stories |
| Project Context | `/project-context` | Auto-detect and load project context |

### Browser & UI

| Skill | Command | What It Does |
|-------|---------|-------------|
| Brave | `/brave` | Brave browser management (navigation, inspection, debugging) |
| Ralph Install | `/ralph-install` | Guided installation wizard |

## Using Skills

In any Claude Code session with golem-powers installed:

```
/commit              # Invoke the commit skill
/interview-practice  # Start interview practice
/railway logs        # Check Railway deployment logs
```

## Installing Skills

Skills are available as a Claude Code plugin:

```bash
# From your project directory
claude --plugin-dir ~/Gits/golems/skills/golem-powers
```

Or symlink into your project's `.claude/commands/` directory for per-project access.

## Source

[`skills/golem-powers/`](https://github.com/EtanHey/golems/tree/master/skills/golem-powers)
