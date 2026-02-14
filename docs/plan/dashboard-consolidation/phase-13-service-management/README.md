# Phase 13: Holistic Service Management System

> [Back to main plan](../README.md)

## Goal

Build a two-layer service management system: launchd schedules always fire (timing layer), but each service can be individually toggled on/off (execution layer). Smart restart for long-running services. Consolidate monitoring with existing tools — no new dependencies.

## Architecture: Two-Layer Model

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: TIMING (launchd)                                  │
│  Always runs if computer is on. Schedules never change.     │
│                                                             │
│  com.golems.telegram-bot    → KeepAlive                     │
│  com.golems.comfyui         → On demand                     │
│  com.golems.render-service  → On demand                     │
│  com.golems.enrichment      → StartCalendarInterval 12h     │
│  com.golems.nightshift      → StartCalendarInterval 3am     │
│  (future cron services...)                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │ fires
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: EXECUTION GATE                                    │
│  Checks if service is enabled before running.               │
│                                                             │
│  ~/.golems/service-enabled/comfyui        → true/false      │
│  ~/.golems/service-enabled/enrichment     → true/false      │
│  ~/.golems/service-enabled/render-service → true/false      │
│  ~/.golems/service-enabled/nightshift     → true/false      │
│  ~/.golems/service-enabled/telegram-bot   → true/false      │
│                                                             │
│  If disabled: exit 0 immediately (launchd sees success)     │
│  If enabled: execute the actual service                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ runs
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICE PROCESS                                            │
│  The actual work (bot, enrichment, comfyui, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Timing layer never changes** — launchd plists always fire on schedule. No `launchctl unload/load` dance.
2. **Gate script wraps each service** — A thin shell wrapper (`~/.golems/bin/service-gate.sh`) checks the enabled flag before executing.
3. **Smart restart for long-running services** — When toggling enrichment back ON, it should RE-LAUNCH immediately, not wait for the next 12h timer. The `golems on enrichment` command both sets the flag AND triggers `launchctl kickstart` to start it now.
4. **State persists across reboots** — `~/.golems/service-enabled/` files survive restarts.

### CLI Interface

```bash
# Master toggle
golems on              # Enable all services
golems off             # Disable all services (graceful — waits for running jobs)

# Per-service toggle
golems on comfyui      # Enable + kickstart if needed
golems off comfyui     # Disable (graceful stop)

# Status shows enabled/disabled state
golems status          # Shows: service name, enabled, running, schedule

# Snapshot/restore (already built in Phase 8)
golems services snapshot   # Save current enabled states
golems services restore    # Restore saved states
```

### Long-Running Service Handling

**Problem:** Enrichment runs for ~12 hours. When user does `golems off enrichment`:
- Option A: Send SIGTERM and wait for graceful shutdown (current chunk finishes)
- Option B: Set disabled flag only — enrichment checks flag periodically and exits after current chunk

**Recommendation:** Option B. The enrichment loop already runs in iterations. Add a check at the start of each iteration:
```python
if not Path("~/.golems/service-enabled/enrichment").exists():
    logger.info("Service disabled, exiting gracefully")
    sys.exit(0)
```

**When turning back ON:** `golems on enrichment` sets the flag AND runs `launchctl kickstart -k system/com.golems.enrichment` to immediately restart.

## Monitoring Consolidation

**Keep all existing tools — add NOTHING new.**

| Tool | Layer | What | Status |
|------|-------|------|--------|
| Axiom | Cloud | Log/telemetry shipping from Railway | Keep — free tier, cloud logs |
| `golems doctor` | CLI | Health checks (ports, DB, configs) | Keep — local diagnostics |
| `golems status` | CLI | Quick service overview | Keep — main CLI entry |
| Dashboard `/ops` | Web | Service monitoring + events | Keep — visual overview |
| Render service `/api/health` | HTTP | Health endpoint | Keep — service checks |
| Railway `/health` | HTTP | Cloud worker health | Keep — uptime |

**NOT adding:** Uptime Robot, Prometheus, Grafana, Datadog, or any new SaaS. The existing stack covers: local health (doctor), cloud logs (Axiom), web dashboard (ops), HTTP probes (health endpoints).

### Integration Points

- `golems status` will show the enabled/disabled state from Layer 2
- `golems doctor` will verify gate scripts are installed correctly
- Dashboard `/ops` will read service states from Supabase `golem_state` table
- Service toggle events logged to `golem_events` for ops timeline

## Steps

1. **Design gate script** — `~/.golems/bin/service-gate.sh` that wraps service execution with enabled check
2. **Update launchd plists** — Point ProgramArguments through the gate script instead of directly to bun/python
3. **Build CLI commands** — `golems on/off [service]` with smart restart for long-running services
4. **Add periodic check to enrichment** — Check enabled flag between iterations for graceful mid-run exit
5. **Update `golems status`** — Show enabled/disabled column alongside running status
6. **Update `golems doctor`** — Verify gate scripts installed, service flags directory exists
7. **Dashboard integration** — Show toggle states on ops page, log toggle events
8. **Test all scenarios** — on/off individual, master toggle, restart long-running, reboot persistence

## Depends On

- Phase 8 (resource management groundwork — snapshot/restore)
- Phase 3 (service monitoring in dashboard)

## Status

- [ ] Gate script design
- [ ] Launchd plist updates
- [ ] CLI on/off commands
- [ ] Enrichment graceful check
- [ ] Status + doctor updates
- [ ] Dashboard integration
- [ ] End-to-end testing
