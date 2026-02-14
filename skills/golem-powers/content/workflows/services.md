---
name: services
description: Manage local background services (ComfyUI, render service, etc.) — start/stop with state preservation
---

# Local Service Management

> Turn local background services on/off with state preservation. Free up RAM for heavy tasks.

## Quick Reference

```bash
# Check what's running
golems services status

# Stop all local services (snapshot state)
golems services stop all

# Start all local services (restore state)
golems services start all

# Individual service control
golems services start comfyui
golems services stop comfyui
golems services start render-service
golems services stop render-service
```

## Service Registry

| Service | Plist | Port | RAM Usage | Auto-Start |
|---------|-------|------|-----------|------------|
| ComfyUI | `com.golems.comfyui` | 8188 | ~2GB idle, ~12GB generating | No |
| Render Service | `com.golems.render-service` | 3001 | ~200MB | No |
| Telegram Bot | `com.golems.telegram-bot` | 3847 | ~100MB | Yes |
| Notification Server | (part of Telegram) | 3847 | Shared | Yes |

## Manual Control (launchctl)

```bash
# ComfyUI
launchctl load ~/Library/LaunchAgents/com.golems.comfyui.plist
launchctl unload ~/Library/LaunchAgents/com.golems.comfyui.plist

# Render Service
launchctl load ~/Library/LaunchAgents/com.golems.render-service.plist
launchctl unload ~/Library/LaunchAgents/com.golems.render-service.plist

# Telegram Bot
launchctl load ~/Library/LaunchAgents/com.golems.telegram-bot.plist
launchctl unload ~/Library/LaunchAgents/com.golems.telegram-bot.plist
```

## RAM Management Strategy

Total system RAM: 32GB

| Scenario | Services to Keep | Free RAM |
|----------|-----------------|----------|
| **Normal work** | Telegram + Notification | ~28GB |
| **Content generation** | + ComfyUI + Render | ~16GB |
| **Heavy Flux generation** | ComfyUI only (stop others) | ~20GB |
| **Video rendering** | Render service only | ~28GB |

## State Snapshot Pattern

Before stopping services for resource-intensive work:

```bash
# 1. Save current service state
golems services snapshot

# 2. Stop heavy services
golems services stop comfyui render-service

# 3. Do your heavy work...

# 4. Restore previous state
golems services restore
```

The snapshot saves which services were running to `~/.golems/service-state.json`.

## Checking Service Health

```bash
# ComfyUI
curl -s http://127.0.0.1:8188/system_stats | jq '.system.comfyui_version'

# Render Service
curl -s http://127.0.0.1:3001/api/health

# Telegram Bot
curl -s http://127.0.0.1:3847/health

# All at once
golems doctor
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Service won't start | Check logs: `tail -50 /tmp/<service>.log` |
| Port already in use | Find process: `lsof -i :<port>`, kill it: `kill <pid>` |
| ComfyUI OOM | Stop other services first, or use `--quick` mode |
| Render service crash | Check Bun version: `bun --version`, restart |
