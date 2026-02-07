---
sidebar_position: 5
title: Per-Repo Sessions
description: Give each project its own Claude personality, tools, and memory
---

# Per-Repo Sessions

Each project gets its own Claude Code session with dedicated personality, MCP tools, and memory. No cross-contamination between projects.

## How It Works

Each repo has three config layers:

```
your-project/
├── CLAUDE.md          # Personality + project context
├── .mcp.json          # MCP servers for this project
└── .claude/
    ├── settings.json  # Permission overrides
    └── commands/      # Project-specific slash commands
```

Claude Code automatically loads these when you `cd` into the project and run `claude`.

## Example: SongScript Claude

SongScript is a song transliteration learning app (TanStack + Convex). Its Claude session knows about:

- **WhisperX pipeline** — audio transcription + forced alignment
- **Convex schema** — songs, segments, user progress
- **Hebrew/Arabic** — RTL-aware, bilingual content

```bash
# Launch SongScript Claude
songClaude

# What happens:
# 1. cd ~/Gits/songscript
# 2. Loads CLAUDE.md (SongScript personality)
# 3. Starts in tmux session (persistent)
# 4. Tab title: 🎵 SongScript Claude
```

## Setting Up Your Own

### 1. Create CLAUDE.md

```markdown
# My Project

## About
What this project does, stack, conventions.

## Commands
- `npm run dev` — start dev server
- `npm test` — run tests

## Patterns
Describe your architecture decisions, naming conventions, etc.
```

### 2. Add MCP Tools (optional)

```json
{
  "mcpServers": {
    "my-tool": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"]
    }
  }
}
```

### 3. Create a Shell Function

```bash
function myProjectClaude() {
  # Set tab title with emoji
  echo -ne "\033]1;🚀 MyProject\007"

  cd ~/Gits/my-project
  claude "$@"
}
```

## Wired Projects

| Project | Function | Personality | MCP Tools |
|---------|----------|-------------|-----------|
| Golems | `gitsClaude` | AI agent ecosystem | zikaron, email, jobs, supabase, exa |
| SongScript | `songClaude` | Music learning app | convex |
| *(private app)* | `domicaClaude` | *(private)* | convex, supabase |

## Tab Title Customization

Set emoji + project name in your terminal tab:

```bash
# In your zsh function, before launching claude:
echo -ne "\033]1;🜔 Golems\007"     # iTerm2, Terminal.app, Warp, WezTerm
echo -ne "\033]1;🎵 SongScript\007"  # Works with emoji in all modern terminals
```

This helps visually distinguish which Claude session is which when running multiple projects.
