# Railway & Cloud Infrastructure

## Project
- **Project/Service:** `helpful-empathy` (production)
- **URL:** `helpful-empathy-production-482d.up.railway.app`
- **Health:** `GET /health` | **Usage:** `GET /usage`
- **Backend:** `gemini` (free Gemini 2.5 Flash-Lite)

## NEVER Delete the Service

`railway down` DELETES the service. We lost 2 days rebuilding in Feb 2026. *(enforced by global hook: ~/.claude/hooks/pre_tool_use.py RED_PATTERNS)*
- Use `railway service restart -y` to restart
- NEVER run `railway down -y`

## Deploy

1. `railway up -d` — upload + deploy local code (primary)
2. `railway redeploy -y` — redeploy from latest upload
3. No GitHub auto-deploy — all deploys are manual

## Dockerfile Notes

- Don't copy `bun.lockb` — causes lockfile mismatch
- All workspace `package.json` files MUST be copied for bun workspace resolution

## Health Monitoring

Stop hook checks Railway health every session stop.
- **Snooze:** `touch ~/.claude/hooks/railway-snooze`
- **Unsnooze:** `rm ~/.claude/hooks/railway-snooze`
