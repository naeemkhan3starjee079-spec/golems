---
name: cli-agents
description: Run external CLI agents (Gemini, Cursor, Codex, Kiro, Claude) via cmux panes. Workers split in current workspace. Audits/research open in a new named workspace. All agents are interactive and visible.
---

# CLI Agents Skill

External AI agents spawned as interactive cmux panes. Two patterns based on intent:

| Intent | Where | Why |
|--------|-------|-----|
| **Worker** (code, implementation, collab) | Split in current workspace | Visible side-by-side, easy to monitor |
| **Audit/Research** (read-only, analysis) | New workspace, named | Doesn't clutter working view, find in sidebar |

## Spawning Workers (split in current workspace)

```bash
# Split right, label it, send the agent command
SURFACE=$(cmux new-split right | awk '{print $2}')
cmux rename-tab --surface "$SURFACE" "Agent Label"
cmux send --surface "$SURFACE" "cd ~/Gits/TARGET_REPO && AGENT_CMD"
cmux send-key --surface "$SURFACE" Return
```

### Agent commands

```bash
# Claude (use repoGolem function or raw CLI)
"claude -s 'your prompt here'"           # -s = dangerously-skip-permissions

# Cursor (work mode — modifies files)
"cursor agent -p --model gpt-5.2-codex-xhigh --trust 'your prompt here'"

# Codex (work mode)
"codex --full-auto 'your prompt here'"

# Gemini (text-only, good for research)
"gemini 'your prompt here'"

# Kiro (text-only)
"kiro-cli chat --no-interactive 'your prompt here'"
```

### Example: 3 parallel workers

```bash
# Launch sequentially (1Password biometric needs ~2s between each)
for repo in brainlayer golems voicelayer; do
  SURFACE=$(cmux new-split right | awk '{print $2}')
  cmux rename-tab --surface "$SURFACE" "$repo"
  cmux send --surface "$SURFACE" "cd ~/Gits/$repo && claude -s 'your task here'"
  cmux send-key --surface "$SURFACE" Return
  sleep 3  # Wait for Touch ID
done
```

## Spawning Audits/Research (new workspace)

```bash
# New workspace so it doesn't clutter your working view
cmux new-workspace
SURFACE=$(cmux list-pane-surfaces --pane "$(cmux list-panes | tail -1 | grep -oE 'pane:[0-9]+')" | grep -oE 'surface:[0-9]+' | head -1)
cmux rename-tab --surface "$SURFACE" "Audit: reponame"
cmux send --surface "$SURFACE" "cd ~/Gits/TARGET_REPO && AGENT_CMD"
cmux send-key --surface "$SURFACE" Return
```

### Example: Cursor audit in separate workspace

```bash
cmux new-workspace
# Get the new surface
SURFACE=$(cmux list-pane-surfaces --pane "$(cmux list-panes | tail -1 | grep -oE 'pane:[0-9]+')" | grep -oE 'surface:[0-9]+' | head -1)
cmux rename-tab --surface "$SURFACE" "Audit: golems"
cmux send --surface "$SURFACE" "cd ~/Gits/golems && cursor agent -p --output-format text --model gpt-5.2-codex-xhigh --trust 'Audit recent changes. Check: code quality, bugs, missing tests, security, dead code. Be harsh.'"
cmux send-key --surface "$SURFACE" Return
```

### Example: Multi-agent audit wave (3 perspectives)

```bash
for i in 1 2 3; do
  cmux new-workspace
  SURFACE=$(cmux list-pane-surfaces --pane "$(cmux list-panes | tail -1 | grep -oE 'pane:[0-9]+')" | grep -oE 'surface:[0-9]+' | head -1)
  cmux rename-tab --surface "$SURFACE" "Audit $i: golems"
  cmux send --surface "$SURFACE" "cd ~/Gits/golems && cursor agent -p --output-format text --model gpt-5.2-codex-xhigh --trust 'ANGLE $i PROMPT'"
  cmux send-key --surface "$SURFACE" Return
  sleep 3
done
```

## Monitoring Agents

```bash
# Check what an agent is doing
cmux read-screen --surface surface:N --lines 8

# Check all agents at once
bash ~/.claude/commands/cli-agents/scripts/agent-status.sh

# Send follow-up to an agent
cmux send --surface surface:N "additional instructions"
cmux send-key --surface surface:N Return
```

## Agent Selection Guide

| Task | Agent | Model | Notes |
|------|-------|-------|-------|
| Plan auditing, perspectives | cursor | GPT-5.2 Codex | Sonnet-tier tasks, don't waste Opus |
| Code review, codebase analysis | cursor | GPT-5.2 Codex | Has @codebase access |
| Quick research, comparisons | gemini | Gemini 2.5 Pro | Free, 1K/day |
| Parallel implementation | cursor/codex | varies | Work mode, modifies files |
| Collab agent (writes to collab file) | claude -s | Opus/Sonnet | Use Sonnet for audit collabs |
| Deep reasoning, architecture | claude -s | Opus | Only when needed |

## Cursor Bug Bot (GitHub PR Reviews)

```bash
# Trigger inline PR review on GitHub
gh pr comment <N> --body "cursor review"
```

## Rules

1. **Workers = split, Audits = new workspace** — don't mix
2. **Launch sequentially** — 1Password biometric needs ~2-3s between spawns
3. **Use Sonnet for audits** — don't waste Opus on read-only analysis
4. **Name workspaces clearly** — "Audit: reponame", "Research: topic"
5. **Monitor with read-screen** — don't assume agents finished
6. **Verify cursor findings** — cursor can't always tell if files are git-tracked. Check with `git ls-files` before acting.
