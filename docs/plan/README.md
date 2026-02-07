# Golems v2 Plan

> Epoch 1: Feb 2026. From scattered scripts to production agent ecosystem.

## Progress

| Phase | Status | PRs | Summary |
|-------|--------|-----|---------|
| [Phase 1: Ship](phase-1-ship/) | ✅ DONE | #7, #8 | Email routing, reply drafting, follow-ups, bug fixes, 333 tests |
| [Phase 2: Cloud](phase-2-cloud/) | ✅ DONE | #9 | Railway deploy, Haiku backend, Supabase state, smart scheduling |
| [Phase 2.5: Infra](phase-2.5-infra/) | ✅ DONE | #10, #14, #16, #17 | Docs site, wizard, admin UI, monitoring, security, doctor |
| [Phase 3: TellerGolem](phase-3-teller/) | ✅ DONE | #15 | Financial domain expert: categorizer, alerts, reports, MCP, 29 tests |
| [Phase 4: Tooling](phase-4-tooling/) | ✅ DONE | #28, #29, #30, #32 | Helpers layer, DeepSource, Exa, skills catalog, docsite redesign |

**Epoch 1: 35/35 parts done (100%) — Complete!**

---

## Epoch 2: Golems v2 Vision (Feb 2026+)

**Full plan:** `~/.claude/plans/compressed-fluttering-torvalds.md`

| # | Phase | Status |
|---|-------|--------|
| 0 | Pre-flight + CLI helper health check | ✅ |
| 1 | Hero improvements (tab pop, sync, 3rd button, bigger) | ✅ |
| 2 | Plan org + Obsidian sync | 🏗️ |
| 3 | Golem character research | ✅ |
| 4 | React Ink TUI | ✅ |
| 5 | etanheyman.com integration | ⏳ |
| 6 | Per-repo sessions | ⏳ |
| 7 | Teaching vision | ⏳ |
| 8 | Content + Claude 4.6 research | ⏳ |
| 9 | Admin dashboard | ⏳ |
| 10 | NightShift upgrade | ⏳ |
| 11 | Centralized config | ⏳ |
| 12 | Axiom + cost tracking | ⏳ |
| 13 | README improvements | ⏳ |
| 14 | Content & privacy sweep | ⏳ |
| 15 | Layout stability (no CLS) | ⏳ |
| 16 | Mobile-first responsiveness | ⏳ |
| 17 | Accessibility audit | ⏳ |
| 18 | Wizard (full build + wiring tests) | ⏳ |

## Phase 4 TODOs (Current)

| # | Part | What | Size | Status |
|---|------|------|------|--------|
| 1 | 29 | DeepSource (replace Dependabot) | S | ✅ DONE |
| 2 | 30 | Highlight.io (observability) | M | ❌ CANCELLED |
| 3 | 31 | Exa MCP (AI web search) | M | ✅ DONE |
| 4 | 32 | Skills discovery catalog | M | ✅ DONE |
| 5 | 33 | Plan restructure + session handoff | M | ✅ DONE |

## Remaining from Earlier Phases

| Part | What | Size | Status |
|------|------|------|--------|
| 2 | Plugin architecture | M | ✅ DONE |
| 4 | Outreach → Obsidian | M | ✅ DONE |
| 5 | Session forking (Telegram) | S | ✅ DONE |
| 11 | Playwright E2E testing | M | ✅ DONE |
| 12 | WhatsApp semantic search | M | ✅ DONE |
| NEW | System detection shared lib | M | ✅ DONE |
| NEW | Autopilot mode (Stop hook) | S | ✅ DONE |

## Phase 4 Completion Notes

**Highlight.io (Part 30):** ❌ CANCELLED - Service shutting down Feb 28 2026, absorbed by LaunchDarkly. No action needed.

**Exa MCP (Part 31):** ✅ DONE - Exa wired into contact-finder.ts as search source (GitHub > Exa > Hunter priority). API key configured in `.mcp.json`.

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
