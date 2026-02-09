# Job Search Command Center

> Transform the golems ecosystem from "AI agent monitoring" into "active job search command center."
> Every feature should directly help Etan find a job.

---

## North Star

> "Found 20 new jobs that match your profile, drafted 7 cover letters and found 5 connections of yours that might have an in to the other 13 — drafted messages to them too."

---

## Progress

| # | Phase | Folder | Status | Branch | Notes |
|---|-------|--------|--------|--------|-------|
| 0 | Fix Broken Services | [phase-0](phase-0/) | done | `feature/jscc-phase0` | reportServiceRun() added to all 4 services |
| 1 | Code Audit + Soltome Removal | [phase-1](phase-1/) | done | `feature/jscc-phase0` | 3028 lines removed, 830 tests pass |
| 2 | Email Dashboard Improvements | [phase-2](phase-2/) | backend done | `feature/jscc-phase0` | MCP tools done, frontend pending |
| 3 | Job Search Dashboard Redesign | [phase-3](phase-3/) | backend done | `feature/jscc-phase0` | Digest, status tracking, cover letters |
| 4 | LinkedIn Connections Pipeline | [phase-4](phase-4/) | done | `feature/jscc-phase0` | 823 imported, matcher + MCP tools |
| 5 | RecruiterGolem Upgrade | [phase-5](phase-5/) | backend done | `feature/jscc-phase5` | Outreach drafts: generation + MCP tools + Supabase |
| 6 | LinkedIn Exposure Skill | [phase-6](phase-6/) | pending | `feature/jscc-phase6` | Independent, writing coach |
| 7 | Cost Tracking + Observability | [phase-7](phase-7/) | done | `feature/jscc-phase7` | Unified paid + free usage tracking |
| 8 | Job Board Expansion | [phase-8](phase-8/) | in progress | `feature/jscc-phase8` | Greenhouse (213 jobs) + Lever (25 jobs) scrapers done |

---

## Execution Rules

### Orchestration Model

**Opus = orchestrator.** Does NOT do bulk work. Launches helpers, reads their output files, makes decisions, writes code.

### CLI Helper Rules (MANDATORY)

1. **NEVER use Claude subagents (Task tool) for research or file reading.** Use CLI helpers instead.
2. **NEVER use `TaskOutput(block: true)` on anything.** All helpers write to files; read those files.
3. **Background everything.** `Bash(command, run_in_background: true)` — then continue working on other phases.
4. **Priority order:** Gemini (free) > Kiro (free) > Codex (ChatGPT Plus) > Cursor ($20/mo) > Haiku subagent ($)

### CLI Helper Syntax

```bash
# Gemini (free, fast, good for research)
gemini -p "prompt" > output.md 2>&1

# Cursor (smart, good for code review + implementation)
cursor agent "prompt" --model gpt-5.2-codex-xhigh --output-format text > output.md 2>&1

# Codex (smart, good for autonomous implementation)
~/.nvm/versions/node/v22.22.0/bin/codex exec --full-auto -o output.md "prompt"

# Claude dangerously (for delegated multi-file implementation)
claude --dangerously-skip-permissions -p "prompt" --output-format text > output.md 2>&1
```

### Delegated Claude Sessions

For phases that touch a **different repo** (etanheyman.com), use:
```bash
cd ~/Gits/etanheyman.com && claude --dangerously-skip-permissions -p "$(cat prompt.md)" --output-format text > ~/Gits/golems/claude.scratchpad.phase-N.md 2>&1 &
```

Rules:
- Write the full prompt to a `.md` file FIRST (so it's reviewable)
- Include ALL context the delegated session needs (no assumptions about what it can see)
- Delegated sessions write output to a scratchpad file, NOT to Opus context
- Opus reads the scratchpad file AFTER the session completes
- Each delegated session gets ONE repo — never cross-repo in a single session

### What Opus Does Directly

- Orchestrate: decide what to launch, in what order
- Write plan files, findings, prompts
- Edit code in golems/packages/autonomous (backend)
- Review CLI helper output and make decisions
- Commit, push, create PRs
- Notify on Telegram

### What Gets Delegated

| Task | To Whom | Why |
|------|---------|-----|
| Code audit / dead code scan | Cursor agent | Reads entire codebase fast |
| Research (LinkedIn API, job boards) | Gemini | Free, good at research |
| etanheyman.com dashboard changes | `claude --dangerously-skip-permissions` | Different repo, full tool access |
| Aviv Levi content extraction | Gemini or Codex | Hebrew processing, file generation |
| Large file reading/summarizing | Gemini | Don't burn Opus context |

### Branch Strategy

- Phases 0-1: can batch into one branch (both are backend cleanup)
- Phase 2: own branch (email changes)
- Phase 3: own branch (job dashboard redesign)
- Phase 4-5: can batch (LinkedIn + RecruiterGolem tightly coupled)
- Phase 6: own branch (skill, independent)
- Phase 7: own branch (observability, independent)
- Phase 8: own branch (new scrapers)

### Cross-Repo Collaboration

| Repo | Phases | How |
|------|--------|-----|
| `golems/packages/autonomous` | 0, 1, 2, 3, 4, 5, 7, 8 | Direct (Opus edits) |
| `etanheyman.com` | 2, 3, 7 | Delegated Claude session |
| `golems/skills` | 6 | Direct (Opus writes skill) |
| `golems/packages/zikaron` | None planned | Only if style card export needs changes |

---

## Cross-Phase Knowledge

- LinkedIn CSV format: `First Name,Last Name,URL,Email Address,Company,Position,Connected On` — 843 connections
- LinkedIn data location: `docs.local/Basic_LinkedInDataExport_02-09-2026.zip/`
- Aviv Levi guidelines: `docs.local/aviv_levi/linkedin-exposure-post/`
- Supabase project: `mkijzwkuubtfjqcemorx` (etanheyman.com)
- Railway project: `helpful-empathy` (golems cloud worker)
- Services are running fine locally (launchd) but don't write state to Supabase — that's why dashboard shows "never"
- Current dashboard pages: Overview, Jobs, Emails, Activity, Outreach, Night Shift, Content
- Content page → remove (Soltome dropped)
- Outreach page → merge into Jobs
- Night Shift → keep but deprioritize

---

## Delegated Prompts (for parallel execution)

These are ready-to-run prompts for other Claude instances or CLI helpers.
See each phase's findings.md for the specific prompt text.

| Prompt | When to Run | Who Runs It | Output File |
|--------|-------------|-------------|-------------|
| Code audit | Phase 1, first thing | Cursor agent | `phase-1/findings.md` |
| LinkedIn research | Phase 4, first thing | Gemini | `phase-4/findings.md` |
| Job board research | Phase 8, first thing | Gemini | `phase-8/findings.md` |
| Dashboard UI (email) | Phase 2, after backend done | Delegated Claude on etanheyman.com | `phase-2/delegated-output.md` |
| Dashboard UI (jobs) | Phase 3, after backend done | Delegated Claude on etanheyman.com | `phase-3/delegated-output.md` |
| Aviv Levi extraction | Phase 6, first thing | Gemini/Codex | `phase-6/findings.md` |

---

## Part 2: Unified Execution Sequence

Everything below follows **linear branch flow**: `master → branch → work → PR → merge → pull master → next branch`.

### Round 1: Zikaron v2 Phase 1 — Dead Code Cleanup (small, unblocks Phases 2-3)
**Branch:** `feature/zikaron-v2-cleanup`
**Effort:** ~30 min
**What:** Delete `pipeline/embed.py` + `pipeline/index.py`, fix `__init__.py` import, fix 3 failing tests, update CLAUDE.md
**Why first:** Small win, clears dead code that confuses contributors, unblocks hybrid search

### Round 2: JSCC Phase 8 — Job Board Expansion (highest job-search impact)
**Branch:** `feature/jscc-phase8`
**Effort:** Research (Gemini) + 2-3 new scrapers + dedup
**What:** Research Israeli job boards → pick top 2-3 → implement scrapers → cross-source dedup → location flexibility
**Why second:** Directly finds more jobs — the #1 goal

### Round 3: Zikaron v2 Phase 2 — FTS5 Hybrid Search
**Branch:** `feature/zikaron-v2-hybrid-search`
**Effort:** ~1-2 hours
**What:** FTS5 virtual table + triggers + `hybrid_search()` + update daemon/MCP/CLI
**Why third:** Makes keyword search ("OTP", "SIGINT") work alongside semantic — improves all agent searches

### Round 4: Zikaron v2 Phase 3 — Context View
**Branch:** `feature/zikaron-v2-context`
**Effort:** ~1 hour + backfill script
**What:** Backfill conversation_id/position, `get_context()`, daemon/MCP/CLI endpoints
**Why fourth:** Makes search results actually useful (see surrounding conversation)

### Round 5: JSCC Phase 6 — LinkedIn Exposure Skill
**Branch:** `feature/jscc-phase6`
**Effort:** Research (Gemini) + skill creation
**What:** Extract Aviv Levi guidelines → `/linkedin-post` skill (topic/draft/review workflows)
**Why fifth:** Networking visibility, but lower urgency than finding actual jobs

### Round 6: JSCC Frontends — Dashboard UI (Phases 2, 3, 5)
**Branch:** `feature/jscc-dashboards`
**Effort:** Delegated Claude sessions on etanheyman.com
**What:** Email dashboard, Job dashboard redesign, Outreach page
**Why sixth:** All backend is done — this makes it visible and usable
**Requires:** Working with Etan (etanheyman.com repo)

### Round 7: Housekeeping — Docs Move + Cleanup
**Branch:** `feature/docs-cleanup`
**What:** Move private docs to `docs.local/`, clean old branches, Dependabot fix
**Requires:** Working with Etan (decision on what's public)

### Deferred (requires interactive session with Etan)
- **Zikaron v2 Phase 4:** SetFit auto-tagger — needs 45-90 min labeling session
- **Zikaron v2 Phase 5:** Email/job scoring feedback loop — needs dashboard work
- **Cloud deploy (Railway):** Needs env vars set in Railway dashboard
