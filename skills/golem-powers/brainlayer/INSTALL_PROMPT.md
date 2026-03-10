# Install: brainlayer

> Use when brain_search/brain_store/brain_recall fail, when you need BrainLayer CLI syntax for indexing/enrichment, or when checking storage stats and DB paths. NOT for basic MCP tool usage (that works automatically).

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/brainlayer/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/brainlayer
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/brainlayer/SKILL.md \
  -o ~/.claude/commands/brainlayer/SKILL.md
```

3. Verify:
```bash
ls ~/.claude/commands/brainlayer/
```

## Usage

```
/brainlayer
```
