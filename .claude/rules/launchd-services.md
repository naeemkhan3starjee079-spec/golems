# Launchd Services — Critical Patterns

## SIGTERM Handling (MANDATORY for KeepAlive + Bun.serve())

```typescript
process.on("SIGTERM", () => {
  server.stop(true); // Release port
  bot.stop();
  process.exit(0);
});
```

Without this: EADDRINUSE crash loop when KeepAlive restarts.

## load-env.ts (MANDATORY for Bun entry points)

```typescript
import "../lib/load-env"; // MUST be first import
```

Launchd runs from `/`, not package root. Without this, all env vars are missing.

## PATH Setup in Plists

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>PATH</key>
  <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
</dict>
```
