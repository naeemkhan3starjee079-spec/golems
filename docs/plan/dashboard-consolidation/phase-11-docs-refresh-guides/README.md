# Phase 11: Docs Refresh — Guides & Configuration

> [Back to main plan](../README.md)

## Goal
Update all guide and configuration docs: getting started, deployment, secrets, skills, FAQ.

## Tools
- **Research:** gemini — verify guide accuracy against current setup
- **Code:** cursor — markdown edits
- **MCPs:** none

## Steps

1. **Update `getting-started.md`** — Current install steps, prerequisites (Bun, CC, Supabase), first run.
2. **Update `configuration/env-vars.md`** — All current env vars across packages (Railway, Vercel, local).
3. **Update `configuration/secrets.md`** — 1Password integration, secret rotation, CI/CD.
4. **Update `deployment/railway.md`** — Current Railway setup, Dockerfile, env vars, health monitoring.
5. **Update `skills.md`** — Current skill catalog (50+ skills across golem-powers).
6. **Update `per-repo-sessions.md`** — CC plugin system, per-golem CLAUDE.md, auto-loaded rules.
7. **Update `interview-practice.md`** — 7 modes, Elo tracking, current state.
8. **Update `faq.md`** — Add new FAQs from recent work (dashboard, enrichment, pipelines).
9. **Create `troubleshooting.md`** — Common issues: enrichment stall, Railway rebuild, launchd crashes, DB locking.
10. **Remove stale docs** — Delete `VERIFICATION-RESULTS.md`, `VERIFICATION-RESULTS-V2.md`, `SECURITY-SWEEP.md` (one-time artifacts, not guides).

## Depends On
- Phase 10 (package docs should be current first)

## Status
- [ ] getting-started.md
- [ ] env-vars.md
- [ ] secrets.md
- [ ] railway.md
- [ ] skills.md
- [ ] per-repo-sessions.md
- [ ] interview-practice.md
- [ ] faq.md
- [ ] troubleshooting.md (new)
- [ ] Remove stale docs
