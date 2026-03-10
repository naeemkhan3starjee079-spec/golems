# Install: cmux

> Use when running inside cmux terminal to control panes, splits, browser, sidebar, and coordinate multi-agent workflows. Covers split panes, notifications, browser automation, agent-to-agent messaging via cmux send. NOT for: regular terminal operations (use Bash), non-cmux sessions.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/cmux/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/cmux
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/cmux/SKILL.md \
  -o ~/.claude/commands/cmux/SKILL.md
```

### Scripts

```bash
mkdir -p ~/.claude/commands/cmux/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/cmux/scripts/run.sh \
  -o ~/.claude/commands/cmux/scripts/run.sh
chmod +x ~/.claude/commands/cmux/scripts/*.sh
```

3. Verify:
```bash
ls ~/.claude/commands/cmux/
```

## Usage

```
/cmux
```
