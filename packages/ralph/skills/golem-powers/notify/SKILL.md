---
name: notify
description: Send Telegram notification to user when task completes
---

```bash
curl -s -X POST http://localhost:3847/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"TITLE","body":"BODY","source":"claude"}'
```

## Usage

Use after significant tasks. Keep title 2-4 words, body 1 sentence max.

## Sources

| source | icon | use for |
|--------|------|---------|
| `claude` | 🤖 | Interactive Claude sessions |
| `ralph` | 🔄 | Ralph autonomous loop |
| `nightshift` | 🌙 | Night Shift runs |

## Gotcha: Exclamation Marks

Bash interprets `!` as history expansion. Avoid in messages or escape:

```bash
# BAD - will fail silently
-d '{"body":"Done!"}'

# GOOD - no exclamation
-d '{"body":"Done."}'

# GOOD - escaped
-d '{"body":"Done\!"}'
```
