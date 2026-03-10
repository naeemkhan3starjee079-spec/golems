# Install: ntfy

> Send push notifications via ntfy.sh. Use for alerting user about completion, errors, or when input is needed. Covers sending notifications, subscribing to topics, priority levels, tags/emojis.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/ntfy/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/ntfy
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/ntfy/SKILL.md \
  -o ~/.claude/commands/ntfy/SKILL.md
```

3. Download workflows:
```bash
mkdir -p ~/.claude/commands/ntfy/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/ntfy/workflows/send.md \
  -o ~/.claude/commands/ntfy/workflows/send.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/ntfy/workflows/subscribe.md \
  -o ~/.claude/commands/ntfy/workflows/subscribe.md
```

4. Verify:
```bash
ls ~/.claude/commands/ntfy/
```

## Usage

```
/ntfy
```
