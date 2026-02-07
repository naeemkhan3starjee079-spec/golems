# Golems v2 Plan

> Epoch 1: Feb 2026. From scattered scripts to production agent ecosystem.

## Progress

| Phase | Status | PRs | Summary |
|-------|--------|-----|---------|
| [Phase 1: Ship](phase-1-ship/) | ✅ DONE | #7, #8 | Email routing, reply drafting, follow-ups, bug fixes, 333 tests |
| [Phase 2: Cloud](phase-2-cloud/) | ✅ DONE | #9 | Railway deploy, Haiku backend, Supabase state, smart scheduling |
| [Phase 2.5: Infra](phase-2.5-infra/) | ✅ DONE | #10, #14, #16, #17 | Docs site, wizard, admin UI, monitoring, security, doctor |
| [Phase 3: TellerGolem](phase-3-teller/) | ✅ DONE | #15 | Financial domain expert: categorizer, alerts, reports, MCP, 29 tests |
| [Phase 4: Tooling](phase-4-tooling/) | 🏗️ ACTIVE | #28 | Helpers layer, DeepSource, Highlight, Exa, skills catalog |

**Overall: 26/33 parts done (79%)**

## Phase 4 TODOs (Current)

| # | Part | What | Size | Status |
|---|------|------|------|--------|
| 1 | 29 | DeepSource (replace Dependabot) | S | 📋 TODO |
| 2 | 30 | Highlight.io (observability) | M | 📋 TODO |
| 3 | 31 | Exa MCP (AI web search) | M | 📋 TODO |
| 4 | 32 | Skills discovery catalog | M | 📋 TODO |
| 5 | 33 | Plan restructure + session handoff | M | 🏗️ IN PROGRESS |

## Remaining from Earlier Phases

| Part | What | Size | Notes |
|------|------|------|-------|
| 2 | Plugin architecture | M | Design done, implementation deferred |
| 4 | Outreach → Obsidian | M | RecruiterGolem data export |
| 5 | Session forking (Telegram) | S | --fork-session pattern |
| 11 | Puppeteer E2E testing | M | Playwright from recordings |
| 12 | WhatsApp semantic search | M | Zikaron indexes WhatsApp |

## How to Use This Plan

**For main Claude (project manager):**
- Read this README for status overview
- Read phase-specific README for detailed TODOs
- Delegate execution to subagents with phase folder path

**For subagents (workers):**
- Read ONLY your assigned phase README
- Create a native CC plan from it
- Execute, commit, report back

**For fresh sessions:**
```bash
cat docs/plan/README.md                    # What's the status?
cat docs/plan/phase-4-tooling/README.md    # What do I need to do?
```

## Architecture Decisions

See [phase-1-ship/README.md](phase-1-ship/) for foundational decisions:
- Golems = domain experts, not I/O channels
- Mac = Brain, Railway = Body
- Plugins auto-inject context per project
- Anti-AI detection in content

## Original Plan

The full original plan (1900+ lines) is preserved in `../golems-v2-branding-plan.md` for reference.
