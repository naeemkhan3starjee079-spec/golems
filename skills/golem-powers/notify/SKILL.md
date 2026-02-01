---
name: notify
description: Send Telegram notification to user when task completes
---

```bash
curl -s -X POST http://localhost:3847/notify -H "Content-Type: application/json" -d '{"title":"TITLE","body":"BODY","priority":"default"}'
```

Use after significant tasks. Keep title 2-4 words, body 1 sentence max.
