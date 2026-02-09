---
name: cli-agents
description: Run external CLI agents (Gemini, Cursor, Codex, Kiro) for research AND implementation. Research mode captures text output. Work mode lets cursor/codex modify files directly — use for parallel implementation instead of Claude subagents.
---

# CLI Agents Skill

External AI agents for research, analysis, and parallel implementation. Use these INSTEAD of Claude subagents (Task tool) whenever possible — they're cheaper or free.

## Two Modes

### Research Mode (default) — text output to file
For: git comment summaries, codebase analysis, doc generation, opinion gathering, code review

```bash
~/.claude/commands/golem-powers/cli-agents/scripts/run.sh <agent> "<prompt>" [output-file]
```

### Work Mode — agent modifies files directly
For: parallel implementation, code generation, file modifications, refactoring (cursor/codex only)

```bash
cd /path/to/repo
~/.claude/commands/golem-powers/cli-agents/scripts/run.sh --work <agent> "<prompt>" [log-file]
```

### Long Prompts — read from file
For prompts too long for shell args, use `@filepath`:

```bash
run.sh cursor @/tmp/my-long-prompt.txt
run.sh --work cursor @/tmp/redesign-prompt.txt /tmp/redesign-log.md
```

## When to Use Each Mode

| Task | Mode | Agent |
|------|------|-------|
| "Summarize this PR's changes" | research | gemini |
| "What's the best auth pattern for Next.js?" | research | gemini/kiro |
| "Review this code for bugs" | research | cursor |
| "Redesign these 3 component files" | **work** | cursor |
| "Refactor auth module to use JWT" | **work** | cursor/codex |
| "Add tests for all untested functions" | **work** | codex |
| "Implement this feature in parallel" | **work** | cursor |

## Examples

### Research: Summarize git PR comments
```bash
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh gemini "Summarize the review comments on PR #19 at github.com/EtanHey/etanheyman.com", run_in_background: true)
```

### Research: Compare approaches
```bash
Bash(~/.claude/commands/golem-powers/cli-agents/scripts/run.sh gemini "Compare FTS5 vs BM25 for hybrid search in SQLite. Which is better for 226K chunks?", run_in_background: true)
```

### Work: Redesign a component (cursor modifies files in-place)
```bash
Bash(cd /path/to/repo && ~/.claude/commands/golem-powers/cli-agents/scripts/run.sh --work cursor "Redesign app/components/Dashboard.tsx with a glassmorphism style. Keep all data fetching, only change visuals." /tmp/dashboard-redesign-log.md, run_in_background: true)
```

### Work: Parallel implementation (4 agents, 4 different tasks)
```bash
# Launch 4 cursor agents in parallel, each working on different files
Bash(cd /repo && run.sh --work cursor @/tmp/task1-prompt.txt /tmp/task1-log.md, run_in_background: true)
Bash(cd /repo && run.sh --work cursor @/tmp/task2-prompt.txt /tmp/task2-log.md, run_in_background: true)
Bash(cd /repo && run.sh --work cursor @/tmp/task3-prompt.txt /tmp/task3-log.md, run_in_background: true)
Bash(cd /repo && run.sh --work cursor @/tmp/task4-prompt.txt /tmp/task4-log.md, run_in_background: true)
```

### Work: Add tests with Codex
```bash
Bash(cd /repo && ~/.claude/commands/golem-powers/cli-agents/scripts/run.sh --work codex "Write unit tests for src/auth/*.ts. Use vitest. Cover all exported functions." /tmp/test-log.md, run_in_background: true)
```

## Agent Capabilities

| Agent | Model | Research | Work | Cost |
|-------|-------|----------|------|------|
| `gemini` | Gemini 2.5 Pro | Yes | No (text-only) | Free (1K/day) |
| `cursor` | GPT-5.2 Codex XHigh | Yes | **Yes** | Cursor Pro ($20/mo) |
| `codex` | OpenAI Codex | Yes | **Yes** | ChatGPT Plus |
| `kiro` | Kiro 1.24 | Yes | No (text-only) | Free tier |

## Rules

1. **Always run in background** (`run_in_background: true`) — don't block the main session
2. **Read the output/log file** when done — don't use `TaskOutput(block: true)`
3. **Gemini first** for research — it's free
4. **Cursor for work** — it has file access and uses GPT-5.2
5. **Work mode requires `cd` to repo first** — agent works in CWD
6. **One prompt, one agent** — each invocation is self-contained
7. **Use `@filepath` for long prompts** — avoids shell escaping issues

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `CURSOR_MODEL` | `gpt-5.2-codex-xhigh` | Override cursor model |
| `CODEX_BIN` | `codex` | Path to codex binary |
