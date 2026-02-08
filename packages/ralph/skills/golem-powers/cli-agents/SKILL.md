---
name: cli-agents
description: Run external CLI agents (Gemini, Cursor, Codex) as one-shot commands. Use when you need research, code review, doc generation, or verification from external AI models. Each agent runs as a background Bash task and writes output to a file you can Read when done.
---

# CLI Agents Skill

One-shot wrappers for external AI CLI tools. Each command runs in background and writes to a file.

## Usage

All agents use the same script. Pass the agent name and prompt:

```bash
~/.claude/commands/golem-powers/cli-agents/scripts/run.sh <agent> "<prompt>" [output-file]
```

**Agents:** `gemini`, `cursor`, `codex`, `kiro`

**Output file** defaults to `/tmp/cli-agent-<agent>-<timestamp>.md`

## Examples

### Research with Gemini (free, fast)
```bash
# Run in background, read output when done
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh gemini "What is the best approach for FTS5 hybrid search in SQLite?", run_in_background: true)
# Later: Read the output file path printed at start
```

### Code review with Cursor (GPT-5.2)
```bash
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh cursor "Review this codebase for unused exports and dead code", run_in_background: true)
```

### Analysis with Codex (OpenAI)
```bash
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh codex "Analyze the test coverage gaps in this project", run_in_background: true)
```

### Custom output path
```bash
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh gemini "Summarize this file" /tmp/my-summary.md, run_in_background: true)
```

## Rules

1. **Always run in background** (`run_in_background: true`) - don't block the main session
2. **Read the output file** when the task completes - don't use `TaskOutput(block: true)`
3. **Gemini first** - it's free. Only use Cursor/Codex when you need their specific capabilities
4. **One prompt, one file** - each invocation is self-contained

## Agent Capabilities

| Agent | Model | Best For | Cost |
|-------|-------|----------|------|
| `gemini` | Gemini 2.5 Pro | Research, opinions, doc review | Free (1K/day) |
| `cursor` | GPT-5.2 Codex XHigh | Codebase-wide analysis, architecture | Cursor Pro ($20/mo) |
| `codex` | Default (cheap) | Code review, test writing | ChatGPT Plus |
| `kiro` | Kiro 1.24 | Research, knowledge base queries | Free tier |
