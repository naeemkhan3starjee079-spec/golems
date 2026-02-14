---
sidebar_position: 8
---

# Engineering Journey

How one developer and Claude Code built an autonomous AI agent ecosystem — and accidentally invented patterns before the platforms shipped them natively.

## Origins

### Pre-2026: Ralph — The Autonomous Coding Loop

Before the Golems ecosystem existed, there was **Ralph** — an autonomous AI coding loop that reads PRD stories and implements them one by one.

Ralph started as a zsh script that spawns fresh Claude sessions in a loop:

```
while stories remain:
  spawn fresh AI → read PRD → implement story → review → commit
done
```

Then came **ralph-ui** — a React Ink terminal dashboard built with node-pty. A real-time CLI interface showing progress bars, story boxes, CodeRabbit review status, iteration headers, and PTY output from the running Claude session. Components like `AliveIndicator`, `HangingWarning`, and `RetryCountdown` handled the reality of autonomous AI: sometimes it hangs, sometimes it fails, and it needs to retry.

Ralph proved that AI could work autonomously on structured tasks. The question became: what if we applied this pattern to *everything* — email, jobs, outreach, finances? That's where Golems began.

### Jan 11, 2026: Memory First

The project started with a question: *what if AI agents could remember?*

Instead of building golems first, we built **Zikaron** — a memory layer using sqlite-vec and bge-large-en-v1.5 embeddings. The insight: memory enables everything else. Without it, every agent session starts from zero.

**Key decisions:**
- sqlite-vec over ChromaDB (stable, zero-dependency, local-first)
- bge-large-en-v1.5 for embeddings (best Hebrew+English support, 1024 dims, MIT license)
- Python daemon with FastAPI (fast iteration, existing ML ecosystem)
- Hybrid search: BM25 + semantic for both keyword and conceptual recall

> "AI is not a tool you use, but a capacity you schedule. Distribute cognition like compute: allocate it, queue it, keep it hot."
> — Boris Cherny, Claude Code creator

### Jan 13: Architecture Crystallizes

Chose monolithic Python daemon over microservices. One process, one database, instant queries. Zikaron now indexes 238K+ conversation chunks and returns results in under 2 seconds.

### Jan 17: First Golem — Email Router

The EmailGolem was born: a Gmail poller that classifies incoming email by domain, scores relevance with Ollama, and routes to the right golem.

**The key insight that shaped everything:**

> "Golems = domain experts, not I/O channels."

An EmailGolem doesn't "do email." It's a triage specialist that happens to receive email as input. A RecruiterGolem doesn't "use LinkedIn." It's an outreach strategist that uses whatever channels reach the target.

### Jan 20: Job Scraper

JobGolem scraped SecretTLV, Goozali, and Drushim for Israeli tech jobs. Built an Elo rating system for match quality. Hit rate limiting immediately — learned to add tiered prefiltering (title → requirements → LLM) to reduce API calls.

### Jan 25: Cloud Migration Strategy

**Decision:** Hybrid architecture instead of full cloud.

```
Mac (Brain)              Railway (Body)
├── Telegram bot         ├── Email poller
├── Night Shift          ├── Job scraper
├── Notifications        └── Briefing generator
└── Ollama (local LLM)
```

The Mac makes decisions. The cloud collects data. Supabase sits in between as the shared state layer.

---

## Multi-Agent Emergence

### Jan 26: Async Collaboration Protocol

Built a file-based inter-session communication protocol before anyone else had one:

```markdown
## From: golem-session @ 2026-01-26 01:35
**Topic:** Integrating Zikaron Active Learning
Hey farther-steps Claude! I'm working on MP-128...

## From: farther-steps-session @ 2026-01-26 11:45
**Re:** Integrating Zikaron Active Learning
Hey! Just finished documenting farther-steps...
```

**Rules:** Append-only, timestamped, session-attributed. No overwrites. Close when consensus reached.

This predates Anthropic's native Agent Teams by **11 days**.

### Jan 26 – Feb 6: Wave System & Personality Emergence

Ran 8 waves of async collaboration with named agent personalities. Something unexpected happened — **the names shaped the behavior**:

| Wave | Focus | Agents | Emergent Behavior |
|------|-------|--------|-------------------|
| 3 | Async Collaboration | CadenceClaude, OutreachGuru, ProfileArchitect | CadenceClaude started using temporal metaphors naturally |
| 5 | Filtering | Promptis, Scout, Velocity | Scout developed a cautious, thorough style |
| 6 | Sources | Hunter, SourceHunter, Watchman | Watchman became vigilant, monitoring-focused |
| 7 | Verification | PipelinePete, PixelPolice, SchemaScout | PixelPolice obsessively checked visual details |
| 8 | Final Verify | StatusVerifier, GPT-5.2 Codex | Cross-model verification |

> "Personalities emerged organically. We didn't program them — giving agents names and roles made them develop distinct communication styles."

### Jan 30: Interview Practice System

Discovered Cantaloupe AI's approach to interview coaching. Built 7 interview modes with Elo tracking: Leetcode, System Design, Debugging, Code Review, Behavioral-Technical, Optimization, Complexity.

---

## Building the Ecosystem

### Feb 1: Persistent Sessions

Solved the "fresh context" problem: use Claude Code's `--resume` flag per-golem. NightShift remembers what it built yesterday. RecruiterGolem remembers which companies it already researched.

### Feb 2: Monorepo Consolidation

Three-Claude merge brought everything under one roof:
- `packages/autonomous/` — All golems, Telegram bot, Night Shift
- `packages/ralph/` — Autonomous coding loop (PRD-driven)
- `packages/zikaron/` — Memory layer (Python + sqlite-vec)

Three parallel Claude sessions coordinated via the collab protocol. Audit trail: 745 lines.

> "Agents must check back MULTIPLE times, not just dump and leave. React to each other — this is collaboration, not parallel dumping."

### Feb 2: Zikaron Proves Itself

The async collaboration protocol from Jan 26 was needed again. Instead of manually finding it:

```bash
zikaron search "collaborative claudes parallel sessions coordination"
# Found in ~2s, score: 0.715
# Rediscovered claude-collab.md automatically
```

Knowledge created 7 days earlier was instantly retrievable — without explicit tagging. The memory layer works.

### Feb 3-4: RecruiterGolem Priority Shift

Job hunting became urgent. RecruiterGolem moved to #1 priority.

**The 80/20 insight:** 80% of the job hunt is networking/outreach, 20% is applications. The hidden job market is 80% — most jobs are never posted.

**Contact discovery strategy:**
1. GitHub org → top contributors → free emails
2. LinkedIn → Claude in Chrome scrape
3. Hunter.io → domain email pattern matching (50 free/month)
4. Lusha → direct lookups (5 free/month, save for high-value targets)

### Feb 5: Content Pipeline Architecture

Designed a multi-model content pipeline:

```
Research (Cursor CLI) → Draft (Claude) → Verify (Cursor) → Approve → Post
```

Cursor's `@codebase` semantic indexing finds related code without exact matches — faster and cheaper than Claude for bulk research.

### Feb 5-6: Anthropic Ships Native Agent Teams

Anthropic released Agent Teams (v2.1.32+):
- Parallel agents in tmux sessions
- `Shift+Up/Down` to switch between teammates
- Memory frontmatter scoping

**What we had that native didn't:**

| Capability | Our System | Native Teams |
|-----------|-----------|--------------|
| Parallel execution | Task spawning | tmux |
| Agent personalities | Named + role-based | None |
| Consensus protocols | 20-pass verification | None |
| Async file communication | claude-collab.md | None |
| Wave iteration | Retry on failure | None |
| Audit trail | tracker.md + round-N | None |
| Identity emergence | Organic from naming | None |

**Strategic decision:** Keep critique-waves protocol, enhance with native hooks.

---

## Rapid Build Phase

### Feb 6-7: Four Phases in 48 Hours

Built the full ecosystem in a concentrated sprint:

**Phase 1 — Ship What's Built:** 8 bug fixes, email routing, reply drafting, follow-up tracking, shared types, agent-runner.ts. 333 tests passing at this point.

**Phase 2 — Cloud Offload:** Mac = brain, Railway = body. Supabase migration (8 new tables), Dockerfile, dual-mode notification sender, state store abstraction. Cost tracking: Haiku 4.5 at $0.80/MTok input.

**Phase 3 — TellerGolem:** Tax categorization by IRS Schedule C category, payment failure alerts via Telegram, monthly/annual expense reports. 29 new tests (TDD).

**Phase 4 — Tooling:** Helpers layer (rate-limited API wrappers), DeepSource static analysis, skills catalog CLI, plugin architecture, session forking, Playwright E2E scaffold.

**Sprint count:** 400+ tests at the time, 35 plan items completed, 3 MCP servers. (Post-Phase 8 componentization: 1,179 tests, 4,056 assertions across 10 packages.)

### Feb 7: Distribution Strategy

Designed a three-tier distribution model:

**Tier 1 — Easy:** Install MCP servers, run `golems setup`. Job scraping, email routing, notifications work out of the box.

**Tier 2 — Power User:** Feed your communication data to Zikaron, get a personalized style card. Customized golem personas, personalized outreach voice.

**Tier 3 — Developer:** Custom skills, new golems, modified contexts. Contribute back to the framework.

> "Ship the skeleton, keep the soul local."

### Feb 7: Public vs Local Split

Scrubbed personal data from the public repo. What ships: example contexts, MCP servers, skills framework, `golems setup` wizard, Docusaurus docs. What stays local: planning docs, style card, job preferences, Zikaron database, communication archives.

---

## Critique Waves: The Consensus Engine

The most novel pattern — a **debate protocol** for multi-agent correctness:

```text
Setup → instructions.md + tracker.md
  ↓
Launch Wave (3 parallel agents)
  ↓
Each agent writes to round-N-agent-X.md
  ↓
Tally: ALL PASS → increment | ANY FAIL → reset to 0
  ↓
Goal: 20+ consecutive passes = consensus
```

This isn't task distribution — it's verification through independent agreement. Native Agent Teams splits work and merges. Critique Waves verifies that multiple agents independently reach the same conclusion.

---

## The Stack

Built entirely with:

- **Bun** — Runtime + test runner + bundler
- **Claude Code** — Primary development tool (Opus 4.5/4.6)
- **Supabase** — PostgreSQL + auth + RLS
- **Railway** — Cloud deployment
- **Grammy** — Telegram bot framework
- **sqlite-vec** — Local vector search (Zikaron)
- **Next.js** — Documentation site (etanheyman.com/golems)

### Feb 7: Zikaron sqlite-vec Migration

ChromaDB was too slow for real-time search (30s cold start). Migrated to **sqlite-vec** with APSW — search dropped to under 2 seconds. bge-large-en-v1.5 embeddings (1024 dims) with MPS acceleration on Apple Silicon. The daemon architecture (`/tmp/zikaron.sock`) keeps the model hot.

### Feb 7: TellerGolem — Tax Season Prep

With tax season approaching, TellerGolem was born: IRS Schedule C expense categorization via LLM, payment failure detection (regex + LLM confirmation), monthly and annual reports. Integrated into the email router — subscription emails automatically get categorized and tracked.

### Feb 7: Docsite Launch

Documentation site with an alchemical workshop theme (ember/obsidian palette), later ported from Docusaurus to Next.js at etanheyman.com/golems. Interactive terminal hero showcasing all golems, Telegram mock showing real notification flows, Mermaid architecture diagrams. Built with help from 5 CLI agents running in parallel (Gemini, Cursor, Codex, Kiro, Haiku).

### Feb 7: Claude Cowork Research

Researched Claude Cowork (web interface) as a distribution channel. Key findings:

- **Claude Code plugin FIRST** — build Golems as CC plugin, same structure converts to Cowork later
- **Cowork limitations:** No daemon management, single-session, no process spawning
- **Verdict:** NOT viable as full plugin. Read-only dashboard OK (show status, recent jobs). "The README is the API" — any Claude can operate the golems CLI
- **Non-technical users:** Ask their Claude "update my golems" — Claude reads the CHANGELOG and walks them through setup in natural language

The CLAUDE.md files ARE the docs for both humans and Claude agents. This means any Claude — Code, Cowork, or API — can operate Golems by reading the repo.

### Feb 7: Epoch 2 — The v2 Plan System

With the foundation built, we created a **folder-based planning system** — each phase gets its own folder with a README.md (plan steps) and findings.md (research results, cross-phase knowledge).

26 phases planned across the full vision:

| Phase | What | Status |
|-------|------|--------|
| Hero v2 | Tab pop animation, logo in terminal, Telegram bidirectional sync, dynamic 3rd button | Done |
| Character Research | Authentic golem identity from Jewish folklore — Prague Golem, Emet/Met, clay creatures | Done |
| React Ink TUI | Terminal dashboard with GolemCard components, expandable "trailers" per golem | Done |
| Content + Claude 4.6 | Research pipeline, Claude 4.6 capabilities audit | Done |
| README + Privacy | Scrub personal data, improve public-facing docs | Done |
| Unified Shell | Centralized shell system across all golem sessions | Done |
| etanheyman.com Integration | Supabase migration, slug URLs, docs link | Done |
| Per-Repo Sessions | Each repo gets its own persistent Claude session | Done |
| Teaching Vision | Design doc + memory folders for guided CLI | Done |
| Admin Dashboard | TypeScript fix, partial wiring (jobs live) | Done |
| Security Hardening | Gibberish detection, RLS, headers, API audit | Done |
| Test Maintenance | Isolated test runner for bun env pollution | Done |
| NightShift Upgrade | Self-healing agent patterns, smarter retry | Planned |
| Wizard | Interactive `golems setup` installer | Planned |
| `/large-plan` Skill | Extract this planning system into a reusable skill | Planned |

**Key pattern discovered:** The findings.md files in each phase folder ARE the async collaboration layer. Agents write research to them, and cross-phase routing in the main README connects knowledge across phases. This is the same collab protocol from Jan 26, formalized.

### Feb 7: Golem Trailers — Show Don't Tell

Each golem tab in the docsite terminal hero now shows a real action demo instead of generic status lines:

- **ClaudeGolem:** `$ claude -c --resume` — context-loaded session, Zikaron memory
- **EmailGolem:** `$ golems email --triage` — inbox scan, category routing, draft replies
- **RecruiterGolem:** `$ golems recruit --find` — Exa search, scoring, outreach drafting, interview practice
- **TellerGolem:** `$ golems teller --briefing` — spend tracking, category breakdown, tax deductions
- **JobGolem:** `$ golems jobs --matches` — fit scoring, auto-apply tracking

The concept: every golem tab is a "trailer" showing what it actually does, not a dashboard of numbers.

---

## Phase 8: The Componentization (Feb 8–11)

The monolith that worked needed to become a plugin ecosystem that scales.

### The Problem

Everything lived in `packages/autonomous/` — a single package with all golems, all services, all infrastructure. It worked, but:
- Couldn't install a single golem as a Claude Code plugin
- Tight coupling between golems made changes risky
- No clear boundaries for contributors
- Test failures in one area blocked everything

### The Solution: 9-Phase Migration

Planned and executed a 9-phase componentization with a strict policy: if anything breaks or feels wrong, **stop and notify on Telegram**. No improvising through blockers.

| Phase | What Happened | Tests After |
|-------|-------------|-------------|
| **1. Extract Shared** | Created `@golems/shared` — Supabase, LLM, email, state, notifications. 12 files moved. | 890 pass |
| **2. Decouple** | Broke all cross-golem imports. Added `getStatus()` to every golem. Zero cross-golem business logic imports. | 890 pass |
| **3. Thin Router** | Telegram bot from 1,957 lines to 97. Each golem gets its own Grammy Composer. | 890 pass |
| **4. Bun Workspaces** | Created 8 package scaffolds. Moved ~80 files via `git mv`. 90 strangler wrappers for backward compat. | 862 pass |
| **5. CC Plugins** | Created `plugin.json` for 7 packages. Wrote CLAUDE.md per golem. 16 skills, 3 agents. | — |
| **6. CoachGolem** | Brand new golem: Google Calendar sync, daily planning, ecosystem status aggregation. 15 tests. | +15 pass |
| **7. Services** | Cloud Worker, Night Shift, Briefing moved to `@golems/services`. Root Dockerfile for Railway workspace. | — |
| **8. Infrastructure** | Launchd plists updated. `load-env.ts` made workspace-aware. Pre-commit hook fixed. | — |
| **9. Distribution** | npm metadata on all packages. READMEs per package. Root CLAUDE.md rewritten. | **1,179 pass** |

### Key Decisions

**Strangler wrappers over big bang.** `packages/autonomous/` kept 1-line re-exports so nothing broke during migration. Tests still pass through the old paths. Zero downtime — the Telegram bot stayed live through all 9 phases.

**EmailGolem dissolved into shared.** Email is infrastructure (polling, scoring, routing), not domain expertise. The email subsystem lives in `@golems/shared/email/` — every golem can receive emails routed to it.

**CLI agents as research assistants.** Cursor with `@codebase` did the bulk file-move planning (282-line manifest). Gemini handled web research. Each phase step was tagged with its executor: `[Opus]`, `[Cursor work]`, `[Gemini research]`, `[context7]`, `[bun test]`, `[manual]`.

### The Result

```
Before:  1 package, ~890 tests, tightly coupled
After:   10 packages, 1,179 tests, each golem independently installable
```

6 golems (Claude orchestrator + Recruiter, Teller, Job, Coach, Content domain experts), plus @golems/shared (including the Email system), @golems/services, Ralph, and Zikaron.

---

## What's Next

### Immediate
- Deploy updated cloud worker to Railway
- 24h smoke test of all launchd plists
- Telegram command verification (all composers)

### Medium-term
- NightShift self-healing (retry strategies, hang detection)
- ContentGolem migration (move logic from skills into `src/`)
- Teaching mode — CLI that explains what it's doing and why
- Axiom observability + cost tracking

### Long-term
- Plugin marketplace for Claude Code extensions
- MCP server distribution (works in Zed, Cursor, VS Code)
- Mobile dashboard (Expo + React Native)
- `/large-plan` skill — formalize async collab planning into a reusable pattern

---

*Built by [Etan Heyman](https://etanheyman.com) with Claude Code.*
