# Install: wizard

> First-time onboarding wizard for the golems ecosystem. Detects installed AI CLIs, configures workspace, sets up skills. Use when setting up golems for the first time, reconfiguring, or onboarding a new machine.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/wizard/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/wizard
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/wizard/SKILL.md \
  -o ~/.claude/commands/wizard/SKILL.md
```

3. Verify:
```bash
ls ~/.claude/commands/wizard/
```

## Usage

```
/wizard
```
