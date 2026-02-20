# Launchd Services

> 13 plists managing local macOS services. KeepAlive vs scheduled, PATH setup, SIGTERM handling.

## Active Services

| Plist | Type | Schedule | What |
|-------|------|----------|------|
| `com.golemszikaron.telegram.plist` | KeepAlive | Always on | Telegram bot + notify server (port 3847) |
| `com.golemszikaron.nightshift.plist` | Scheduled | 4am daily | Night Shift autonomous coding |
| `com.golemszikaron.briefing.plist` | Scheduled | 8am daily | Morning briefing to Telegram |
| `com.golemszikaron.healthcheck.plist` | Scheduled | 9am daily | Service health verification |
| `com.golemszikaron.compactor.plist` | Scheduled | 3am daily | Thread compaction |
| `com.golemszikaron.ollama.plist` | KeepAlive | Always on | Ollama server |
| `com.golems.bedtime-guardian.plist` | Scheduled | 10pm daily | Evening wind-down |
| `com.golems.session-archiver.plist` | Scheduled | Periodic | Archive Claude sessions |
| `com.golems.auto-index.plist` | Scheduled | Periodic | BrainLayer auto-indexing |
| `com.golems.enrichment.plist` | KeepAlive | Background | BrainLayer enrichment pipeline |
| `com.golems.mlx-server.plist` | KeepAlive | Always on | MLX inference server |
| `com.golems.comfyui.plist` | KeepAlive | On demand | ComfyUI for content generation |
| `com.golems.render-service.plist` | KeepAlive | On demand | Bun render microservice |

## Critical Patterns

### SIGTERM Handling (MANDATORY for KeepAlive + Bun.serve())

```typescript
process.on("SIGTERM", () => {
  server.stop(true); // Release port
  bot.stop();
  process.exit(0);
});
```

Without this: EADDRINUSE crash loop when KeepAlive restarts the process.

### load-env.ts (MANDATORY for Bun entry points)

```typescript
import "../lib/load-env"; // MUST be first import
```

Bun auto-loads `.env` from cwd. Launchd runs from `/`, not package root. Without this, all env vars are missing.

### PATH Setup

Plists must include PATH for Bun, Python3, and Ollama:

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>PATH</key>
  <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
</dict>
```

### Python3 for MLX

Use system Python3 (`/usr/bin/python3` or homebrew) — not venv Python — for mlx-server plist.

## Management Commands

```bash
# Load/unload
launchctl load ~/Library/LaunchAgents/<plist>
launchctl unload ~/Library/LaunchAgents/<plist>

# List active golems services
launchctl list | grep golems

# Restart
launchctl kickstart -k gui/$(id -u)/<label>

# View logs
golems logs <service-name>
```

## ThrottleInterval

Use `<key>ThrottleInterval</key><integer>5</integer>` as safety net for KeepAlive services — prevents rapid crash-restart loops.
