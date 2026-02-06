# Golems v2: Architecture, Plugins & Strategic Plan

> Created: 2026-02-05 | Updated: 2026-02-06
> Status: Active - continuously updated

## Table of Contents

- [Executive Summary](#executive-summary)
- [Part 1: Claude Code vs Golems](#part-1-what-claude-code-now-offers-vs-what-we-built)
- [Part 2: Plugin Architecture](#part-2-plugin-architecture-rebrand)
- [Part 3: Notification Channel](#part-3-notification-channel-migration) (DROPPED)
- [Part 4: Outreach → Obsidian](#part-4-outreach-drafts--obsidian)
- [Part 5: Session Forking](#part-5-claude---continue----fork-session-for-telegram)
- [Part 6: Legal Status](#part-6-legal-status-cli-tools)
- [Part 7: Style Distribution](#part-7-semantic-style-distribution)
- [Part 8: Service Monitoring](#part-8-service-monitoring--auto-wiring)
- [Part 9: Positioning](#part-9-positioning-oren-yam-post-context)
- [Part 10: TellerGolem](#part-10-tellergolem-new---opus-46-finance)
- [Part 11: E2E Testing](#part-11-puppeteer-user-testing-from-recordings)
- [Part 12: Semantic Search](#part-12-otpwhatsapp-semantic-search)
- [Part 13: Skill Reorganization](#part-13-skill-reorganization--extension-architecture-new---2026-02-06)
- [Part 14: Domain Golem Architecture](#part-14-architecture-refactor---domain-golems-2026-02-06) (core)
- [Part 15: Output Styles](#part-15-per-golem-output-styles-research-2026-02-06)
- [Part 16: Zed IDE](#part-16-zed-ide-integration-research-2026-02-06)
- [Part 17: Plugin Security](#part-17-plugin-security--distribution-research-2026-02-06)
- [Part 18: Cloud Offload](#part-18-cloud-offload---stop-mac-247-2026-02-06) (Railway)
- [Part 19: Claude Code Audit](#part-19-claude-code-2130-2133-audit-2026-02-06)
- [Research References](#research-references)

---

## Executive Summary

Claude Code's plugin system is now mature. Our golems ecosystem can be repackaged as a **branded Claude Code plugin** with an install wizard, addons system, and marketplace-ready distribution. This positions us perfectly against the "AI leadership" trend (see Oren Yam's post - engineering = managing agent teams).

**Architecture principle (v2):** Golems are **domain experts** (Recruiter, Teller, Content, Claude), not I/O channels. Email, Telegram, Soltome, CLI are just interfaces. Zikaron and Ollama are infrastructure. NightShift and Briefing are scheduling patterns, not golems. See Part 14 for full architecture.

---

## Part 1: What Claude Code Now Offers (vs What We Built)

### Official Features vs Golems

| Feature | Claude Code Official | Golems | Status |
|---------|---------------------|--------|--------|
| **Memory** | CLAUDE.md hierarchy + auto-memory (NEW 2.1.32) | Zikaron (sqlite-vec, semantic search, 200k+ chunks) | Complementary - ours is retrospective, theirs is prescriptive |
| **Skills/Commands** | `.claude/skills/` + plugin system | `.claude/commands/golem-powers/` | Should migrate to plugin format |
| **Subagents** | Custom agents in `.claude/agents/` with persistent memory | Ralph loop + Night Shift + specialized golems | Theirs is simpler; ours is more autonomous |
| **Agent Teams** | EXPERIMENTAL - multi-agent orchestration | Ralph (proven, battle-tested) | Wait for theirs to mature, keep Ralph |
| **Notifications** | None | Telegram bot + notifications server | **Unique differentiator** |
| **Job Pipeline** | None | JobGolem + RecruiterGolem | **Unique differentiator** |
| **Content Creation** | None | Soltome + post generator | **Unique differentiator** |
| **Email Triage** | None | EmailGolem | **Unique differentiator** |

### Key Takeaway

Claude Code now handles the "foundation" (memory, commands, subagents) well. Golems' value is in the **domain-specific automations** on top - recruiting, email, content, night shift. These are addons that make Claude Code actually useful for daily life.

---

## Part 2: Plugin Architecture (Rebrand)

### Current Structure → Plugin Structure

```
golems-plugin/
├── .claude-plugin/
│   └── plugin.json           # Manifest
├── commands/                  # Slash commands
│   ├── morning.md            # /golems:morning
│   ├── jobs.md               # /golems:jobs
│   ├── outreach.md           # /golems:outreach
│   ├── practice.md           # /golems:practice
│   └── tonight.md            # /golems:tonight
├── skills/                    # Agent skills
│   ├── recruiter/SKILL.md    # RecruiterGolem skill
│   ├── email-triage/SKILL.md # EmailGolem skill
│   ├── night-shift/SKILL.md  # Night Shift skill
│   └── content/SKILL.md      # Soltome content skill
├── agents/                    # Custom subagents
│   ├── job-golem.md          # Job scraping agent
│   ├── email-golem.md        # Email triage agent
│   └── recruiter-golem.md    # Outreach agent
├── hooks/
│   └── hooks.json            # Post-commit, pre-push hooks
├── .mcp.json                 # MCP servers (sophtron, brave)
└── installer/
    ├── install.sh            # One-command setup
    └── wizard.ts             # Interactive setup wizard
```

### Install Wizard Flow

```
$ npx golems-cli install

Welcome to Golems! 🤖

Step 1: Core Setup
  ✓ Creating $GOLEMS_DATA/
  ✓ Installing Claude Code plugin
  ✓ Setting up CLAUDE.md hierarchy

Step 2: Choose Addons (select with space)
  [x] Core (base) - Scheduler, morning briefing, notify, golems CLI
  [ ] RecruiterGolem - Jobs, outreach, interviews, job email routing
      → Requires: Ollama (for scoring)
      → Optional: Hunter.io, Lusha (for contacts)
  [ ] TellerGolem - Tax filing, subscriptions, financial email routing
      → Requires: Sophtron MCP (bank data)
      → Optional: Gmail OAuth (for subscription emails)
  [ ] ContentGolem - Multi-platform content (Soltome, blog, etc.)
      → Optional: Soltome API key, Zikaron (style analysis)
  [ ] Email Router - Gmail triage, routes to other golems
      → Requires: Gmail OAuth
      → Enhanced by: RecruiterGolem, TellerGolem (smart routing)
  [ ] Zikaron - Memory layer (semantic search, style analysis)
      → Requires: Python 3.10+, ~2GB disk (embeddings model)

Step 3: Notification Channel
  ( ) Telegram (group with topics)
  (x) WhatsApp (via WhatsApp Business API)
  ( ) Both
  ( ) None (CLI only)

Step 4: Schedule
  ✓ Installing launchd agents
  ✓ Night Shift: 4am daily
  ✓ Job scrape: every 30min
  ✓ Email triage: every 10min

Done! Run `golems status` to verify.
```

### Update Flow (3 audiences)

```
golems update
  ├── Auto: pull code, install deps, restart services
  ├── Auto: wire new MCP servers, skills, hooks
  └── Interactive: "These need your help:"
       ├── "Upload new recruiter-golem.md to claude.ai"
       ├── "Set HUNTER_API_KEY (want me to show you how?)"
       └── "New addon available: TellerGolem. Install? [y/n]"
```

**Technical users:** `golems update` + CHANGELOG.md, they handle the rest.

**Semi-technical (CLI-comfortable):** `golems update` spawns Claude that explains
what changed and guides them through manual steps interactively.

**Non-technical (Cowork/Telegram users):** Ask their Claude "update my golems" -
Claude runs `golems update` on their behalf, reads the CHANGELOG, walks them
through setup in natural language. The CLAUDE.md IS the docs for both humans and
Claude agents.

> Key insight: We don't build separate UX for non-technical users. We make the
> CLI and docs good enough that any Claude instance can operate it. The README
> is the API.

### Claude Chat Project Files (DONE - 2026-02-06)

`golems instructions` command shows uploadable markdown files for claude.ai:
- `contexts/claude-chat/recruiter-golem.md` - RecruiterGolem project instructions
- `contexts/claude-chat/claude-golem.md` - ClaudeGolem project instructions
- `contexts/claude-chat/style-card.md` - Owner style (auto-generated from Zikaron)

`golems regen-style` regenerates style-card.md from `semantic-style-data.json`.

Files can't be symlinked (claude.ai stores project instructions server-side only).
Users upload manually. `golems update` tells them when files changed.

### Addon Dependencies

```
golems-core (base) ← Scheduler, Briefing, Notify, CLI, event-log
├── RecruiterGolem
│   ├── needs: Ollama
│   ├── optional: Hunter.io, Lusha (contact emails)
│   └── optional: Email Router (job email routing)
├── TellerGolem
│   ├── needs: Sophtron MCP (bank data)
│   ├── absorbs: packages/tax-helper/
│   └── optional: Email Router (subscription email routing)
├── ContentGolem
│   ├── channels: Soltome, blog, LinkedIn (via RecruiterGolem)
│   ├── optional: Zikaron (style analysis)
│   └── optional: RecruiterGolem (branding collab)
├── Email Router (daemon, not a golem)
│   ├── needs: Gmail OAuth, Ollama
│   └── routes to: RecruiterGolem, TellerGolem, Claude Code
└── Zikaron (infrastructure, not a golem)
    ├── needs: Python, sentence-transformers, sqlite-vec
    └── enhances: all golems (memory + style)
```

### Smart Addon Discovery

When Claude encounters something it can't do but an addon could:

```
Claude: "I'd like to check your emails for job-related messages,
but EmailGolem isn't installed. Want me to set it up?
Run: golems addon install email-golem"
```

---

## Part 3: Notification Channel Migration

> **STATUS: DROPPED** - Root cause identified as iOS 26 beta APNs bug (affects ALL apps, not just Telegram).
> Keep Telegram as-is. Revisit when iOS 26 stable fixes push notifications.

### Problem (RESOLVED)
Telegram notifications don't deliver reliably - user only sees them when opening the app.

### Options

| Channel | Push Reliability | Setup Complexity | Cost |
|---------|-----------------|-----------------|------|
| **WhatsApp Business API** | ✅ Excellent (always delivers) | Medium (Meta verification) | Free for first 1000 msgs/month |
| **WhatsApp via Twilio** | ✅ Excellent | Easy (Twilio account) | $0.005/msg |
| **WhatsApp Green API** | ✅ Good | Easy (no Meta approval) | $5.50/month |
| **Telegram** (current) | ⚠️ Unreliable push | Already done | Free |
| **ntfy.sh** | ✅ Good (push to phone) | Very easy | Free |
| **Pushover** | ✅ Excellent | Very easy | $5 one-time |

### Recommendation: Tiered approach

**Tier 1: Beeper Cloud (ZERO CODE - try first)**
- Install Beeper app, link Telegram + WhatsApp
- Existing Telegram bot notifications arrive via Beeper's unified push
- Solves the push problem immediately, no code changes
- Free (Beeper Cloud)
- If this works → skip Tier 2

**Tier 2: WhatsApp Communities via Green API ($5.50/mo)**
- Only if Beeper doesn't cut it (need native WhatsApp presence)
- WhatsApp Communities = Telegram Topics equivalent:
  ```
  Golems Community
  ├── 💬 Chat        → --resume whatsapp-chat (ClaudeGolem)
  ├── 👔 Recruiter   → --resume recruiter-golem
  ├── 📧 Email       → --resume email-assistant
  ├── 🔔 Alerts      → one-way notifications
  └── 🎯 Jobs        → one-way notifications
  ```
- Each group ID maps to a Claude session with its own persona
- Green API: REST API, no Meta approval, Node.js SDK

**Tier 3: Matrix bot + bridges (future, full control)**
- Self-hosted Matrix homeserver + mautrix bridges
- ONE bot codebase → all platforms (WhatsApp, Telegram, Signal, Discord, LinkedIn DMs)
- Full E2EE, you control the server
- Higher setup effort but most future-proof
- LinkedIn DM bridge = game changer for RecruiterGolem outreach

**Migration plan:**
1. Try Beeper Cloud first (5 min setup)
2. If push works → keep Telegram bot as-is, Beeper handles delivery
3. If need native WhatsApp → add Green API with Community routing
4. If scaling to multiple platforms → Matrix bot migration

---

## Part 4: Outreach Drafts → Obsidian

### Current Location
SQLite DB at `$GOLEMS_DATA/recruiter/outreach.db`

### Proposed: Obsidian Vault Integration

```
~/Obsidian/Golems/
├── Recruiter/
│   ├── Outreach/
│   │   ├── 2026-02-05-acme-corp.md    # One file per company
│   │   ├── 2026-02-05-startup-xyz.md
│   │   └── _index.md                  # Dashboard with status
│   ├── Contacts/
│   │   └── john-smith-acme.md
│   └── Pipeline/
│       └── _kanban.md                 # Application tracker
└── Jobs/
    ├── Hot/                           # Score 8+
    ├── Warm/                          # Score 6-7
    └── Archive/
```

### Each outreach file would look like:

```markdown
---
company: Acme Corp
contact: John Smith
role: Engineering Manager
score: 9
status: draft
message_type: email
created: 2026-02-05
---

# Outreach: Acme Corp - John Smith

## Job
Senior Full Stack Developer (Score: 9/10)
Tech: React, TypeScript, Node.js

## Draft Message
Subject: ...
Body: ...

## Status
- [ ] Review draft
- [ ] Personalize further
- [ ] Send
- [ ] Follow up (7 days)
```

---

## Part 5: Claude --continue / --fork-session for Telegram

### Current: Single persistent session
```bash
claude --resume telegram-chat
```

### Potential: Fork for deep dives
```bash
# User asks complex question in Telegram
# Bot forks current session for deep research
claude --resume telegram-chat --fork-session -p "Research X deeply"
# Fork preserves context but doesn't pollute main chat session
```

### Benefits:
- Main chat session stays focused
- Forked sessions can do deep work without bloating context
- Forked sessions could be indexed by Zikaron for future reference

### Index Impact:
- Track fork-parent relationships
- If same issue appears in multiple forks, flag for prompt improvement
- Use fork metadata to identify when conversations go in multiple directions

---

## Part 6: Legal Status (CLI Tools)

| Tool | Automation Legal | Cost | Recommendation |
|------|-----------------|------|----------------|
| **Claude Code** | ✅ Explicitly supported (SDK) | Subscription | Primary tool |
| **Gemini CLI** | ✅ Explicitly supported | Free (1K/day) | Safe for research agents |
| **Kiro CLI** | ✅ Supported (AWS) | Free tier (50 credits) | Safe for specialized tasks |
| **Cursor CLI** | ⚠️ Ambiguous ToS for automation | Subscription credits | Use for interactive, get clarification for automation |

### Recommendation
- **Primary**: Claude Code (we're building on it)
- **Research fallback**: Gemini CLI (free, explicit automation support)
- **Cursor**: Use interactively, avoid heavy automation until ToS clarified

---

## Part 7: Semantic Style Distribution

### Currently Distributed To:
- `$GOLEMS_DATA/style/semantic-style-data.json` ✅ (loaded by style-adapter.ts)
- Zikaron archives at `zikaron/data/archives/style-*/` ✅

### Should Also Be In:
- Claude web/cowork: **Does NOT auto-get this** - you'd need to paste key style insights
- RecruiterGolem context: ✅ Already wired via style-adapter.ts
- Soltome posts: ✅ Already uses style data
- Obsidian (if added): Would need export script

### Recommendation:
Create a portable `my-communication-style.md` summary that can be:
1. Pasted into Claude.ai projects
2. Imported by any Claude Code session via `@import`
3. Shared across tools

---

## Part 8: Service Monitoring & Auto-Wiring

### Problem
Services fail silently. User sees `✗ job-golem (exit: 7501)` but no alert.

### Solution: Enhanced healthcheck

```bash
# golems doctor - comprehensive check
golems doctor

=== GOLEMS DOCTOR ===
✓ Telegram Bot     running (port 3847, last msg 5m ago)
✓ Ollama           running (qwen3 loaded)
✓ Job-Golem        scheduled (next run in 12m, last success 28m ago)
✓ Email-Golem      scheduled (next run in 3m, last success 7m ago)
✗ Job-Golem Sync   FAILING - Missing readFileSync import
  → Fix: golems latest
✓ Night Shift      scheduled (next: 4am, target: songscript)

Outreach Drafts: 3 pending review
Unread Job Alerts: 7
```

### Auto-Wire New Addons

When adding a new golem/service:
```bash
golems addon add my-new-golem
# Creates:
# - src/my-new-golem/index.ts (template)
# - launchd/com.golemszikaron.my-new-golem.plist
# - Adds to golems status/doctor
# - Adds to healthcheck
```

---

## Part 9: Positioning (Oren Yam Post Context)

The LinkedIn post describes the **xEngineer** - someone who manages a team of AI agents instead of writing code. This is EXACTLY what Golems enables:

> "הוא לא כתב שורת קוד אחת, אבל הוא מסופק."
> "He didn't write a single line of code, but he's satisfied."

### Golems = The xEngineer's Toolkit

| xEngineer Need (from post) | Golems Feature |
|---------------------------|----------------|
| Delegation to agents | Night Shift, RecruiterGolem, EmailGolem |
| Monitoring agent work | `golems status`, `golems doctor` |
| Defining context & checkpoints | CLAUDE.md hierarchy, Zikaron memory |
| Business awareness | Morning briefing, job pipeline |
| Project management | Task tracking, PR management |
| Cost management ("moving to cheaper model") | Ollama for scoring, Claude for complex |
| Setting guardrails | SOUL.md, permission modes, vetted skills |

### For RecruiterGolem/Portfolio

This post + our project = strong positioning:
- "I built the system Oren describes - a team of AI agents I manage"
- "Here's how I coordinate 6 specialized agents for job search, email, code improvements"
- Portfolio project: **Golems - An xEngineer's Agent Team**

---

## Execution Priority

| # | What | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix job-golem sync (readFileSync bug) | 5min | ✅ DONE |
| 2 | WhatsApp notification channel | 2h | HIGH - user gets alerts |
| 3 | Obsidian outreach integration | 2h | HIGH - visible drafts |
| 4 | Portable style summary for Claude.ai | 30min | MEDIUM |
| 5 | `golems doctor` enhanced monitoring | 2h | MEDIUM |
| 6 | Plugin architecture migration | 4h | MEDIUM - marketplace ready |
| 7 | Install wizard (npx golems-cli) | 4h | HIGH for branding |
| 8 | Addon dependency system | 3h | MEDIUM |
| 9 | --fork-session for Telegram | 1h | LOW - nice to have |
| 10 | Portfolio positioning (Oren Yam angle) | 2h | HIGH for job search |
| 11 | TellerGolem (taxes/banking) - Opus 4.6 finance | 4h | HIGH - tax season |
| 12 | Cowork plugin for Domica team | 3h | MEDIUM - team productivity |
| 13 | Puppeteer user-testing from recordings → CI | 4h | HIGH - QA automation |
| 14 | Context sharing Claude Code ↔ Cowork (via repo) | 2h | MEDIUM |
| 15 | OTP filter for WhatsApp (semantic search) | 2h | MEDIUM |
| 16 | Categorize dev tools from git commits | 2h | LOW |
| 17 | Interactive `golems addon add` screen | 3h | MEDIUM |
| 18 | Archive old contexts (replaced by official memory) | 1h | LOW - cleanup |

---

## Part 10: TellerGolem (NEW - Opus 4.6 Finance)

> **Monetization target.** Both Israel + US. Persona/CLAUDE.md needed like other golems.
> Already have `tax-helper` subagent + Sophtron MCP but no dedicated golem yet.
> ContentGolem is LOW priority standalone - RecruiterGolem already has the content brains (style-adapter, outreach generation).
> Forms: Opus 4.6 has Claude in Excel + PowerPoint. Output = Excel tax reports, PDF summaries, or Obsidian markdown.
> Scope: Basic "categorize transactions" = weekend build. Full tax filing = multi-week.
> `claude plugin install golems-teller` = GOAL, not yet built. Marketplace exists, we publish when ready.

Opus 4.6 scores **76% on TaxEval** and **60.7% on Finance Agent benchmark**.
Can handle: SEC filings, tax analysis, investment research, corporate finance.

### Capabilities for Us
- **Tax categorization**: Already have Sophtron MCP for bank data
- **Expense tracking**: Bank transactions → tax categories
- **Financial reports**: Generate spreadsheets from transaction data
- **Tax prep**: Identify deductions, categorize expenses

### Architecture
```
Sophtron MCP (bank data) → TellerGolem → Tax categories → Obsidian/Excel
                                       → Monthly reports
                                       → Tax prep summaries
```

### Integration with Existing
- Sophtron MCP tools already configured (GETCUSTOMERS, GETACCOUNTS, GETTRANSACTIONS)
- Could use Cowork's Excel plugin for spreadsheet generation
- WhatsApp alerts for unusual transactions

---

## Part 11: Puppeteer User Testing from Recordings

### Concept
1. User walks through app flow (recorded via Playwright codegen)
2. Claude analyzes recording → generates Playwright test
3. Tests run in GitHub Actions on PRs
4. Failed tests = visual regression

### Implementation
```bash
# Record user session
npx playwright codegen http://localhost:3000

# Claude refines into proper test
claude -p "Refine this Playwright recording into a proper E2E test" < recording.ts

# Add to CI
# .github/workflows/e2e.yml
```

### For Domica Team
- Non-technical team members record flows in Cowork
- Claude converts to Playwright tests
- Tests added to PR checks automatically

---

## Part 12: OTP/WhatsApp Semantic Search

### Concept
- Semantic search through WhatsApp messages for OTPs, verification codes
- Filter WhatsApp exports by category (dev, personal, OTP, work)
- Zikaron indexes WhatsApp exports → searchable via `zikaron search "OTP from bank"`

### Dev Tool Categorization
- Parse git commit history across all repos
- Categorize tools used (frameworks, libraries, CLIs)
- Build "developer profile" from actual usage patterns
- Feed into RecruiterGolem for better job matching

---

## Obsidian Research Reference

Rich async research lives in Obsidian:
```
$OBSIDIAN_VAULT/
  Projects/Golems/Ideas/JobGolem/
  ├── Research-Collab.md      # Wave 1: Local exploration
  ├── Implementation-Collab.md # Wave 1: Union repo mapping
  ├── Ideation-Collab.md      # Wave 2: Feature ideation
  ├── Prompt Engineering Research.md  # Qwen optimization
  ├── Wave3-AsyncCollab/      # Async collaboration patterns
  ├── Wave5-Filtering/        # Prefilter research (Promptis, Scout, Velocity)
  ├── Wave6-Sources/          # Source hunting (Hunter, SourceHunter, Watchman)
  ├── Wave7-Verification/     # Pipeline verification (SchemaScout, PixelPolice)
  └── Wave8-Verification/     # Final verification (StatusVerifier, gpt-5.2-codex)
```

Also check: `@packages/zikaron/docs/showcase-claude-collab-discovery.md`
for the inter-Claude collaboration pattern via shared files.

---

## Part 13: Skill Reorganization & Extension Architecture (NEW - 2026-02-06)

> **Goal:** Convert flat 34-skill list into proper Claude Code extension categories.
> Make golems "whole" - not just readers but interactive assistants.
> Each golem gets the right extension type: Skill (interactive), MCP (data), Plugin (bundled).

### Current Problem

34 skills dumped in `.claude/commands/golem-powers/` with no clear categorization.
EmailGolem only reads - doesn't organize WITH user or help write replies.
Zikaron has MCP entry point (`zikaron-mcp`) but nobody uses it.
No golems expose data as MCP tools for Claude to use natively.

### Extension Type Mapping

| Type | Purpose | Examples |
|------|---------|---------|
| **Skill** (SKILL.md) | Interactive user workflows | `/email organize`, `/outreach review`, `/practice` |
| **MCP Server** (.mcp.json) | Data providers - Claude calls these as tools | `zikaron-search`, `email-getInbox`, `jobs-getMatches` |
| **Plugin** (.claude-plugin/) | Bundled packages for distribution | `golems-recruiter`, `golems-email`, `golems-teller` |
| **Launchd Daemon** | Background workers (no user interaction) | Job scraping, email polling, night shift |

### Skill Reorganization (34 → 6 categories)

**Category 1: Golem Operations** (controlling the system)
- `email-golem` → EVOLVE to full email assistant (see below)
- `notify` - Send notifications
- `tax-helper` → EVOLVE into TellerGolem skill
- `soltome` + `soltome-influencer` → MERGE into `content` skill
- `interview-practice` - Keep as-is

**Category 2: Development Workflow** (code lifecycle)
- `commit` + `ralph-commit` → Keep both (different contexts)
- `create-pr`, `prd`, `prd-manager` - Keep
- `coderabbit` - Keep
- `test-plan`, `archive` - Keep

**Category 3: Code Intelligence** (search/navigate)
- `lsp`, `context7`, `github`, `github-research` - Keep
- `zikaron` → Also add as MCP server

**Category 4: Environment** (setup/config)
- `ralph-install`, `1password`, `project-context`, `context-audit` - Keep
- `brave`, `convex`, `worktrees` - Keep

**Category 5: Context Recovery** (catch up)
- `catchup`, `catchup-recent` - Keep

**Category 6: Meta** (skill management)
- `critique-waves`, `learn-mistake`, `writing-skills`, `skills` - Keep
- `obsidian` - Keep
- `example-bash`, `example-typescript` - Templates, keep

### New MCP Servers to Create

```json
// Add to .mcp.json:
{
  "mcpServers": {
    "sophtron": { ... },  // existing
    "zikaron": {
      "command": "zikaron-mcp"
    },
    "golems-email": {
      "command": "bun",
      "args": ["run", "packages/autonomous/src/email-golem/mcp-server.ts"]
    },
    "golems-jobs": {
      "command": "bun",
      "args": ["run", "packages/autonomous/src/job-golem/mcp-server.ts"]
    }
  }
}
```

**Zikaron MCP tools:**
- `zikaron_search` - Semantic search past conversations
- `zikaron_stats` - Get database stats
- `zikaron_style` - Get communication style analysis

**Email MCP tools:**
- `email_getRecent` - Get recent emails (with score filter)
- `email_search` - Search emails by keyword/sender
- `email_categorize` - Interactively categorize emails with user
- `email_draftReply` - Draft reply using semantic style
- `email_getFollowups` - Get emails needing follow-up

**Jobs MCP tools:**
- `jobs_getHot` - Get 8+ scoring jobs
- `jobs_search` - Search job history
- `jobs_getOutreachDrafts` - Get pending outreach drafts

### EmailGolem Evolution: Reader → Assistant

**Current:** Read → Score → Store → Alert (one-way)

**Target:** Full interactive email assistant

```
/email                    → Dashboard: unread count, urgent, follow-ups needed
/email organize           → Walk through inbox WITH user, categorize together
/email reply <id>         → Draft reply using semantic style, user approves
/email followups          → Show emails waiting for response > 3 days
/email subscriptions      → Monthly spend summary, cancel suggestions
/email thread <id>        → Summarize email thread, suggest next action
```

**Implementation:**
1. Create `email-golem/mcp-server.ts` - expose email data as MCP tools
2. Evolve `email-golem` SKILL.md from status-checker to full workflow
3. Add reply drafting using `style-adapter.ts` (already built for recruiter)
4. Add follow-up tracking (new field in Supabase: `needs_followup`, `followup_by`)

### Zikaron Distribution Strategy

| Audience | Format | What They Get |
|----------|--------|---------------|
| **Technical devs** (us) | MCP server + CLI | Full power: search, index, stats, style analysis |
| **Claude Code users** | Plugin (`golems-zikaron`) | Auto-configured MCP, skill for `/zikaron search` |
| **Non-technical** | NOT for them | Too complex (local Python, embeddings, sqlite-vec) |

**Quick win:** Just enable `zikaron-mcp` in `.mcp.json` - it already works!

### Plugin Bundles (Distribution)

> **SUPERSEDED by Part 14** - see updated bundles that reflect domain golem architecture.
> Key change: No standalone `golems-email` plugin. Email routing is part of `golems-core`.
> Soltome/content is `golems-content` (multi-platform, not Soltome-specific).

Each plugin has: `.claude-plugin/plugin.json` + skills/ + .mcp.json + hooks/

---

## Updated Execution Priority (2026-02-06)

| # | What | Effort | Impact | Status |
|---|------|--------|--------|--------|
| 1 | Fix job-golem sync (readFileSync bug) | 5min | ✅ | DONE |
| **19** | **Enable Zikaron MCP in .mcp.json** | **5min** | **HIGH** | **NEW - quick win** |
| **20** | **Reorganize skill-index.md with categories** | **30min** | **MEDIUM** | **NEW** |
| **21** | **EmailGolem MCP server (expose data as tools)** | **2h** | **HIGH** | **NEW** |
| **22** | **EmailGolem reply drafting (reuse style-adapter)** | **2h** | **HIGH** | **NEW** |
| **23** | **EmailGolem follow-up tracking** | **1h** | **MEDIUM** | **NEW** |
| **24** | **Jobs MCP server (expose job data as tools)** | **1h** | **MEDIUM** | **NEW** |
| **25** | **Merge soltome + soltome-influencer skills** | **30min** | **LOW** | **NEW** |
| 2 | WhatsApp notification channel | 2h | HIGH | |
| 3 | Obsidian outreach integration | 2h | HIGH | |
| 4 | Portable style summary for Claude.ai | 30min | MEDIUM | |
| 5 | `golems doctor` enhanced monitoring | 2h | MEDIUM | |
| 6 | Plugin architecture migration | 4h | MEDIUM | |
| 7 | Install wizard (npx golems-cli) | 4h | HIGH for branding | |
| 8-18 | (unchanged) | | | |

---

## Part 14: Architecture Refactor - Domain Golems (2026-02-06)

> **Core insight:** Golems are **domain experts**, not input/output channels.
> Email, Telegram, CLI, MCP, Claude Chat are just interfaces to reach the golems.
> NightShift and Briefing are patterns, not golems. Zikaron is infrastructure.

### What's Wrong Today

| Thing | Current Abstraction | Problem | Should Be |
|-------|-------------------|---------|-----------|
| **EmailGolem** | Standalone golem | Email is an input channel, not a domain | **Router** that feeds RecruiterGolem, TellerGolem, Claude Code |
| **NightShift** | Standalone script | Does 3 unrelated things (repo, Soltome learn, drafts) | **Scheduler pattern** - any golem registers overnight work |
| **Briefing** | Standalone script | Just aggregates other golems' data | **Report aggregator** - golems register what they want in briefing |
| **Soltome** | 5 files + 2 skills + part of NightShift | Scattered content creation | **Channel** for ContentGolem (like LinkedIn is for RecruiterGolem) |
| **OllamaGolem** | Separate Telegram bot | Same pattern as ClaudeGolem but for Ollama | **Backend option** for ClaudeGolem or dev tool only |
| **TaxHelper** | Separate package | Tax is one function of finance | Part of **TellerGolem** |
| **Zikaron** | Separate package | Used by all golems for memory + style | **Infrastructure layer** (like Ollama, not a golem) |
| **Helper sprawl** | cursor-helper, gemini-helper, kiro-helper | 3 files, same pattern | One **agent-runner** lib |

### Clean Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: INTERFACES (how users/tools reach golems)             │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐ │
│  │ Telegram │ │MCP Server│ │ CLI  │ │  Claude  │ │ Briefing │ │
│  │   Bot    │ │(per golem)│ │golems│ │Chat Proj│ │(aggregatr)│ │
│  └────┬─────┘ └────┬─────┘ └──┬───┘ └────┬─────┘ └────┬─────┘ │
└───────┼────────────┼──────────┼──────────┼────────────┼────────┘
        │            │          │          │            │
┌───────┼────────────┼──────────┼──────────┼────────────┼────────┐
│  LAYER 4: GOLEMS (domain brains)                                │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │RecruiterGolem│ │ TellerGolem  │ │ ContentGolem │            │
│  │              │ │              │ │              │            │
│  │ Jobs         │ │ Tax filing   │ │ Soltome      │            │
│  │ Outreach     │ │ Subscriptions│ │ Blog/Twitter │            │
│  │ Job emails   │ │ Financial    │ │ Brand voice  │            │
│  │ Interviews   │ │   emails     │ │ Positioning  │            │
│  │ LinkedIn     │ │ Spending     │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ ClaudeGolem  │ ← Dispatcher + general chat + coordination    │
│  │              │   Owns: Telegram face, session management,    │
│  │              │   routes unknown emails, general requests      │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
        │            │          │
┌───────┼────────────┼──────────┼─────────────────────────────────┐
│  LAYER 3: DATA SOURCES (polling daemons on launchd)             │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │  Gmail   │ │ Job Board│ │  Web     │                        │
│  │  Poller  │ │ Scraper  │ │ Scraper  │                        │
│  │ +Scorer  │ │(SecretTLV│ │(Soltome) │                        │
│  │→routes to│ │ etc)     │ │          │                        │
│  │ golems   │ │→Recruiter│ │→Content  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
        │            │          │
┌───────┼────────────┼──────────┼─────────────────────────────────┐
│  LAYER 2: SCHEDULING (when things run)                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ NightWork│ │ Morning  │ │ Polling  │ │ Healthchk│          │
│  │ (4am)    │ │ Briefing │ │ (10-30m) │ │ (9am)    │          │
│  │ any golem│ │ all golem│ │ email/job│ │          │          │
│  │ registers│ │ data     │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
        │            │          │
┌───────┼────────────┼──────────┼─────────────────────────────────┐
│  LAYER 1: INFRASTRUCTURE (shared by everything)                 │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐│
│  │Zikaron │ │ Ollama │ │  Agent    │ │Event Log │ │  Notify ││
│  │(memory)│ │(scoring│ │  Runner   │ │(golem    │ │(Telegram││
│  │(style) │ │ + gen) │ │(Claude/   │ │ actions) │ │ delivery││
│  │        │ │        │ │Gemini/etc)│ │          │ │         ││
│  └────────┘ └────────┘ └───────────┘ └──────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Email Routing (replaces monolithic EmailGolem)

The email triage daemon (launchd, every 10min) stays as-is. It scores emails, then routes:

| Category | Score | Routed To | What Happens |
|----------|-------|-----------|-------------|
| `interview` | 10 | RecruiterGolem | Telegram alert + auto-prep materials |
| `job` | 7-9 | RecruiterGolem | Morning briefing + outreach check |
| `subscription` | 5-6 | TellerGolem | Subscription tracking, spending report |
| `urgent` | 10 | ClaudeGolem | Immediate Telegram alert |
| `tech-update` | 7-9 | ContentGolem | Potential content ideas |
| Everything else | any | Email MCP | Available for Claude Code reply drafting |

### Soltome = Channel, Not Golem

Soltome is a **posting platform** (like LinkedIn, Twitter, blog). ContentGolem decides WHAT to say, Soltome/LinkedIn/blog are WHERE to say it.

```
ContentGolem
├── Channels:
│   ├── Soltome (soltome-client.ts)     → AI community posts
│   ├── LinkedIn (via recruiter)         → Professional content
│   ├── Blog (future)                    → Long-form articles
│   └── Twitter/X (future)              → Short-form
├── Content Pipeline:
│   ├── soltome-learner.ts              → Learn from platform
│   ├── post-generator.ts              → Critique-waves drafting
│   └── style-adapter.ts              → Voice matching
├── Skills:
│   └── /content (merged soltome + soltome-influencer)
└── Branding Collab:
    └── ContentGolem + RecruiterGolem collaborate on golems branding
        when ready to open-source / share packages
```

### Zikaron = Infrastructure Layer

Zikaron is NOT a golem. It's infrastructure that all golems use, like Ollama.

```
Zikaron provides:
├── Semantic search (past conversations)    → used by ClaudeGolem
├── Style analysis (communication patterns) → used by RecruiterGolem, ContentGolem
├── Memory indexing (session archival)       → used by all
└── MCP server (zikaron-mcp)                → Claude Code integration

Distribution:
├── Claude Code: MCP server in .mcp.json (already done)
├── Claude Chat: paste style summary in project instructions
├── Technical users: pip install zikaron
└── Golems plugin: auto-configured as dependency
```

### NightShift = Scheduler Pattern

Any golem can register "overnight work". NightShift dispatches, not implements.

```typescript
// Each golem registers work it wants done overnight:
interface NightWork {
  golem: string;       // "recruiter" | "content" | "teller"
  task: string;        // "research-new-companies" | "generate-drafts"
  priority: number;    // 1-10
  estimatedMinutes: number;
}

// NightShift at 4am:
// 1. Collect registered work from all golems
// 2. Sort by priority
// 3. Execute within time budget (2 hours)
// 4. Report results to Briefing aggregator

// Current night shift work mapped to golems:
// - Repo improvements → ClaudeGolem (code improvements)
// - Soltome learning → ContentGolem
// - Draft generation → ContentGolem
// - Company research for 8+ jobs → RecruiterGolem
```

### Claude Chat Projects (FREE - Per-Golem Instructions)

Claude Chat (claude.ai) supports per-project custom instructions. Each golem gets its own project:

| Claude Chat Project | Instructions Include | Use Case |
|-------------------|---------------------|----------|
| **Recruiter** | Job search context, target companies, outreach style, interview prep patterns | "Help me prep for X interview" |
| **Teller** | US + Israel tax rules, bank account structure, expense categories, Sophtron context | "Categorize these transactions" |
| **Content** | Brand voice (SOUL.md), Soltome posting strategy, target audience, past post performance | "Draft a post about X" |
| **Golems Dev** | Full CLAUDE.md, architecture, MCP configs, all technical context | Development work |

**Setup:** Generate `project-instructions.md` per golem from existing CLAUDE.md + SOUL.md + context files.
Paste into claude.ai project settings. Zero code needed.

### Helper Consolidation

```
BEFORE (3 separate files):
├── cursor-helper.ts   → spawns Cursor CLI
├── gemini-helper.ts   → spawns Gemini CLI
├── kiro-helper.ts     → spawns Kiro CLI

AFTER (1 unified runner):
└── lib/agent-runner.ts
    ├── runAgent("cursor", prompt, options)
    ├── runAgent("gemini", prompt, options)
    ├── runAgent("kiro", prompt, options)
    └── runAgent("claude", prompt, options)
```

### Updated Plugin Bundles (reflects domain golems)

```
golems-core/           → Scheduler + Briefing + Notify + golems CLI + event-log
                         (base dependency for all others)

golems-recruiter/      → RecruiterGolem (jobs + outreach + interviews + job emails)
                         MCP: golems-jobs
                         Skills: /jobs, /outreach, /practice
                         Channels: LinkedIn, email
                         Requires: Ollama, golems-core

golems-teller/         → TellerGolem (tax + subscriptions + financial emails + spending)
                         MCP: golems-teller + sophtron
                         Skills: /tax, /spending, /subscriptions
                         Absorbs: packages/tax-helper/
                         Requires: Sophtron MCP, golems-core

golems-content/        → ContentGolem (drafts + brand voice + multi-platform posting)
                         Skills: /content (merged soltome + soltome-influencer)
                         Channels: Soltome, blog, LinkedIn (via recruiter)
                         Uses: style-adapter, critique-waves, post-generator
                         Requires: golems-core
                         Optional: Zikaron (style analysis)

golems-zikaron/        → Zikaron infrastructure (memory + style + search)
                         MCP: zikaron-mcp
                         Skills: /zikaron
                         Note: Infrastructure, not a golem
                         Requires: Python, sentence-transformers, sqlite-vec

golems-email-router/   → Email triage daemon (scores + routes to other golems)
                         MCP: golems-email (for Claude Code reply drafting)
                         Launchd: every 10min polling
                         Routes to: recruiter, teller, or Claude Code
                         Requires: Gmail OAuth, Ollama, golems-core
```

### What This Changes (Migration Path)

1. **No big rewrite needed.** The code mostly stays where it is.
2. **Logical grouping** changes: update imports, move subscription tracking from email to teller.
3. **Skill merges**: `soltome` + `soltome-influencer` → `/content`
4. **NightShift refactor**: Add registration pattern, golems declare what overnight work they want.
5. **Briefing refactor**: Golems register their morning report data.
6. **Claude Chat projects**: Generate instructions from existing context files (zero code).
7. **Helper consolidation**: Merge 3 files into 1 agent-runner.

---

## Updated Execution Priority (2026-02-06 v2)

| # | What | Effort | Impact | Status |
|---|------|--------|--------|--------|
| 1 | Fix job-golem sync (readFileSync bug) | 5min | ✅ | DONE |
| 19 | Enable Zikaron MCP in .mcp.json | 5min | HIGH | DONE |
| 20 | Reorganize skill-index.md with categories | 30min | MEDIUM | DONE |
| 21 | EmailGolem MCP server (5 tools) | 2h | HIGH | DONE |
| 24 | Jobs MCP server (5 tools) | 1h | MEDIUM | DONE |
| **26** | **Claude Chat project instructions (per golem)** | **1h** | **HIGH** | **DONE** |
| **35** | **Portable style export (TDD, 13 tests)** | **30min** | **MEDIUM** | **DONE** |
| **36** | **`golems instructions` + `regen-style` CLI** | **30min** | **MEDIUM** | **DONE** |
| **27** | **Email routing: triage daemon routes to golems** | **2h** | **HIGH - architecture fix** | **NEW** |
| **28** | **Merge soltome skills → /content skill** | **30min** | **MEDIUM** | **NEW (was #25)** |
| 22 | Email reply drafting (reuse style-adapter) | 2h | HIGH | |
| 23 | Email follow-up tracking | 1h | MEDIUM | |
| **29** | **NightShift → scheduler pattern refactor** | **3h** | **MEDIUM** | **NEW** |
| **30** | **Helper consolidation (3→1 agent-runner)** | **1h** | **LOW** | **NEW** |
| **31** | **ContentGolem: own Soltome + drafting + channels** | **3h** | **MEDIUM** | **NEW** |
| **32** | **TellerGolem: absorb tax-helper + subscriptions** | **3h** | **HIGH - tax season** | **NEW** |
| **33** | **Briefing as aggregator (golems register data)** | **2h** | **MEDIUM** | **NEW** |
| **34** | **ContentGolem + RecruiterGolem branding collab** | **2h** | **HIGH when packaging** | **NEW** |
| **37** | **JobGolem: add `job_match` event logging (logEvent)** | **30min** | **MEDIUM** | **NEW** |
| **38** | **ClaudeGolem ghostwriting context (Hebrew tech WhatsApp)** | **15min** | **LOW** | **NEW** |
| 4 | Portable style summary for Claude.ai | 30min | MEDIUM | |
| 5 | `golems doctor` enhanced monitoring | 2h | MEDIUM | |
| 3 | Obsidian outreach integration | 2h | HIGH | |
| 6 | Plugin architecture migration | 4h | MEDIUM | |
| 7 | Install wizard (npx golems-cli) | 4h | HIGH for branding | |
| 11 | TellerGolem (full build) | 4h | HIGH - tax season | |
| 2 | Notification channel (dropped - iOS 26 APNs bug) | — | — | DROPPED |
| 8-18 | (rest unchanged) | | | |

---

## Part 15: Per-Golem Output Styles (Research: 2026-02-06)

> Claude Code supports custom output styles via `~/.claude/output-styles/*.md`.
> Each file has frontmatter (`name`, `description`, `keep-coding-instructions`) + markdown body.
> Styles modify system prompt. Periodic reminders enforce adherence.
> Can bundle in plugins via `outputStyles` field in plugin.json.

### Discovered API

```yaml
# ~/.claude/output-styles/recruiter-coach.md
---
name: RecruiterCoach
description: Elevated-professional coaching for job search and outreach
keep-coding-instructions: true
---

## Communication Style
[markdown body becomes system prompt modifier]
```

**Built-in styles:** Default, Explanatory, Learning
**Custom styles:** Any .md file in output-styles directory
**Plugin bundling:** `outputStyles: ["styles/recruiter.md"]` in plugin.json

### Planned Golem Output Styles

| Golem | Style Name | Key Traits |
|-------|-----------|------------|
| RecruiterGolem | `recruiter-coach` | Elevated-professional (~0.58-0.64 formality), NO em dashes, NO AI patterns, match recipient LinkedIn tone |
| TellerGolem | `teller-advisor` | Guiding/explanatory (NOT teaching), friendly financial advisor, clear but not condescending |
| ContentGolem | `content-editor` | Editorial voice, brand-aware, critique-waves integration |
| ClaudeGolem | `claude-casual` | Matches owner style card (0.47 formality), Hebrew/English code-switching |

### Outreach Formality (User Decision)

- Natural voice: ~0.47 formality
- Outreach elevation: **20-30% of remaining space** (0.47 → ~0.58-0.64)
- Plus: **Match recipient's LinkedIn/GitHub tone** per message
- Source: Scrape recipient's LinkedIn posts for tone analysis
- Anti-AI: No em dashes, no weird punctuation, no "Certainly", no corporate speak
- Careful: Don't accidentally commit AI-style patterns in git messages too

---

## Part 16: Zed IDE Integration (Research: 2026-02-06)

> Researched 6 months of Zed changelog. ACP = Agent Client Protocol (open standard).
> MCP works natively. Custom agents via TypeScript SDK.

### What Zed Offers Us

| Feature | Status | Use Case |
|---------|--------|----------|
| **MCP servers** | ✅ Native | All 3 golems MCP servers work in Zed |
| **ACP custom agents** | ✅ TypeScript SDK | Per-golem agents in tabbed panel |
| **Multi-agent tabs** | ✅ Available | RecruiterGolem + TellerGolem side by side |
| **Remote terminal** | ❌ Not available | Can't bridge to Telegram |
| **File-save hooks** | ❓ Needs investigation | "Can Zed alert Claude on file save?" - user asked |
| **Native Claude agent** | ✅ Built-in | Zed has its own Claude integration |
| **Spring 2026** | 🔜 Planned | Multi-agent collaboration feature |

### Integration Plan

1. **MCP workspace setup** (30min) - Configure existing MCP servers in Zed settings
2. **Interview practice in Zed** - RecruiterGolem creates practice files in IDE, user edits, agent reviews
3. **File-save alerting** - Investigate if Zed can trigger Claude agent on save (user asked this)

### NOT Building

- Remote terminal (not supported)
- Telegram bridge via Zed (not possible)
- Full Zed plugin (overkill for now)

---

## Part 17: Plugin Security & Distribution (Research: 2026-02-06)

### Claude Code Plugin Security Model

- **Trust-based, NOT sandboxed** - plugins run with full user permissions
- 9000+ community plugins, no centralized vetting
- Known attack vectors: dependency hijacking, hook exploitation
- Anthropic doesn't audit plugins

### Our Distribution Strategy (User Decision)

1. **CC plugin FIRST** - Build golems as Claude Code plugin
2. **Easy to convert to Cowork later** - Same structure, different manifest
3. **Cowork limitations**: No daemon management, single-session, no process spawning
4. **Non-technical users**: Ask their Claude to run `golems update` - Claude reads CHANGELOG, guides them

### Cowork Verdict

- ❌ NOT viable as full plugin (no daemons, no background processes)
- ✅ Read-only dashboard OK (show status, recent jobs, etc.)
- ✅ "The README is the API" - any Claude can operate golems CLI

---

## Part 18: Cloud Offload - Stop Mac 24/7 (2026-02-06)

> **Problem:** Mac must be on 24/7 for launchd daemons (job scraping, email polling, night shift, Ollama scoring, telegram bot).
> **Idea:** Move background polling to Railway/cloud. Mac becomes the "brain" (Claude Code), cloud is the "body" (data collection).

### What Currently Needs Mac On

| Service | Schedule | Why Mac | Cloud-able? |
|---------|----------|---------|-------------|
| **Telegram bot** | Always on | grammy bot, port 3847 | ✅ Easy - stateless HTTP |
| **Job scraper** | Every 30min | Scrapes → Ollama scores → Supabase | ✅ If Ollama replaced |
| **Email poller** | Every 10min | Gmail API → Ollama scores → Supabase | ✅ If Ollama replaced |
| **Night Shift** | 4am | Spawns Claude Code sessions | ❌ Claude Code is local |
| **Ollama** | On demand | qwen2.5-coder:32b scoring | ⚠️ Needs cloud LLM alternative |
| **Briefing** | 8am | Aggregates data → Telegram | ✅ Easy - reads from Supabase |
| **Soltome learner** | 2am | Scrapes platform | ✅ Easy - stateless |

### Cloud Architecture (Railway/Fly.io)

```
┌─────────── CLOUD (Railway) ──────────────┐
│                                           │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Telegram │  │ Job      │  │ Email  │ │
│  │ Bot      │  │ Scraper  │  │ Poller │ │
│  │ (always) │  │ (30min)  │  │ (10min)│ │
│  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │              │            │       │
│       ▼              ▼            ▼       │
│  ┌─────────────────────────────────────┐ │
│  │         Supabase (DB)               │ │
│  │  jobs, emails, events, state        │ │
│  └─────────────────────────────────────┘ │
│       │                                   │
│  ┌────▼────┐  ┌──────────┐              │
│  │Briefing │  │ Soltome  │              │
│  │ (8am)   │  │ Learner  │              │
│  └─────────┘  └──────────┘              │
└───────────────────────────────────────────┘
         │
         │ Telegram push / Supabase sync
         ▼
┌─────── LOCAL MAC (on-demand) ─────────────┐
│                                            │
│  ┌──────────────┐  ┌───────────────────┐  │
│  │ Claude Code  │  │ `golems morning`  │  │
│  │ (brain)      │  │ = sync from cloud │  │
│  │ Night Shift  │  │   + process       │  │
│  │ Outreach     │  │   + show briefing │  │
│  └──────────────┘  └───────────────────┘  │
└────────────────────────────────────────────┘
```

### Ollama Replacement Options (for cloud scoring)

| Option | Cost | Latency | Quality vs qwen2.5:32b |
|--------|------|---------|------------------------|
| **Groq API** (llama3) | Free tier / $0.05/1M tok | ~200ms | Similar |
| **Together.ai** (qwen2.5) | $0.06/1M tok | ~300ms | Same model! |
| **Claude Haiku** | $0.25/1M tok | ~500ms | Better but pricier |
| **Ollama on Railway** | ~$7/mo (GPU) | ~1s | Exact same |
| **Keep Ollama local** | Free | — | Only works when Mac on |

**Recommendation:** Together.ai running qwen2.5 = same model, cloud-hosted, cheap.
Or Groq for speed. Either way, replace `ollama-wrapper.ts` with API client.

### User Flow After Migration

```bash
# Wake up, open Mac
golems on
# → "Good morning! Overnight: 12 new jobs scored, 3 urgent emails,
#    Night Shift skipped (Mac was off). Run /morning for briefing."

# Sync and process
golems morning
# → Pulls cloud data, shows briefing, queues Night Shift catch-up

# Or from Telegram (works even with Mac off!)
/morning
/jobs
/status
```

### Research Results (2026-02-06)

#### Platform Comparison

| Platform | Always-On Bot | Cron Jobs | Bun Support | GPU | Est. Cost |
|----------|--------------|-----------|-------------|-----|-----------|
| **Railway** | $3-5/mo (256MB) | Built-in (50 on Hobby) | ✅ Native Nixpacks | ❌ None | **$6-8/mo** |
| **Fly.io** | $2/mo (shared) | Complex setup | Via Dockerfile | ⚠️ $1.25/hr | **$3-4/mo** (no GPU) |
| **Render** | $7/mo (Starter) | $1/mo each | Via Dockerfile | ❌ None | **$12/mo** |
| **Coolify** (self-hosted) | VPS $4-10/mo | You manage | Full control | Depends on VPS | **$4-10/mo** |

**Winner: Railway** - Native Bun, built-in crons, excellent DX, fits in $5-8/mo Hobby plan.

#### Ollama Replacement (REQUIRED - no cloud GPU is affordable)

| Provider | Model | Input | Output | Speed | Notes |
|----------|-------|-------|--------|-------|-------|
| **Groq** | Llama 3.1 8B | $0.05/M | $0.08/M | 840 TPS | Cheapest + fastest |
| **OpenRouter** | Qwen2.5-Coder 32B | $0.03/M | $0.11/M | Slower | Same model we use! |
| **Together.ai** | Qwen2.5 | $0.06/M | — | ~300ms | Good alternative |
| **Claude Haiku** | Haiku 4.5 | $0.25/M | — | ~500ms | Best quality, pricier |

**Estimated LLM API cost:** ~$0.09/month (35 jobs + 20 emails/day = tiny token volume).
**Decision: Use Claude Haiku 4.5** ($0.25/M input, ~$0.50/month total at our volume).
At 35 jobs + 20 emails/day, the cost difference between cheapest and best is 41 cents.
Haiku also handles company research, initial outreach scoring, and email categorization.
The "brain" (Opus/Sonnet for drafting, interview prep) stays local on Claude Code.

#### Umami (Analytics)

**What it is:** Self-hosted, privacy-focused web analytics (Google Analytics alternative).
Railway has a one-click deploy template. Uses PostgreSQL internally.

**Relevance to us:** Could track etanheyman.com portfolio analytics, or Soltome engagement metrics.
**Priority:** LOW - nice-to-have, not blocking anything.

### Migration Path

1. **Move Telegram bot to Railway** (easiest, highest impact - notifications work 24/7)
2. **Replace `ollama-wrapper.ts` with cloud LLM client** (OpenRouter/Groq API)
3. **Move job scraper + email poller** (now cloud-LLM powered, no GPU needed)
4. **Move briefing + soltome learner** (lightweight crons)
5. **Keep Night Shift local** (needs Claude Code, which is local-only)
6. **Add `golems sync` / `golems morning`** for Mac wake-up data pull from Supabase

---

## Part 19: Claude Code 2.1.30-2.1.33 Audit (2026-02-06)

> Current version: **2.1.33**. Audited changes from 2.1.30-2.1.33.

### USE NOW (High Impact for Golems)

| Feature | Version | What It Means |
|---------|---------|---------------|
| **Agent Memory** | 2.1.33 | `memory: project` in agent frontmatter. Each golem auto-remembers across sessions. Could supplement/replace event-log.ts for session context. |
| **Sub-Agent Spawning Control** | 2.1.33 | `Task(agent_type)` restricts sub-agents. RecruiterGolem can only spawn allowed agent types. Safer plugin distribution. |
| **68% --resume memory reduction** | 2.1.30 | `--resume telegram-chat` loads way faster. Direct win for our persistent Telegram session. |
| **Task Tool Metrics** | 2.1.30 | Token count + duration on Task results. Can track cost per golem operation, add to briefing. |
| **Plugin names in /skills** | 2.1.33 | `golems-recruiter` shows in skill menu. Better UX for plugin distribution. |
| **/debug command** | 2.1.30 | Built-in troubleshooting. Complements `golems doctor`. |

### PLAN FOR (Medium-Term)

| Feature | Version | What It Means |
|---------|---------|---------------|
| **Agent Teams** (experimental) | 2.1.32 | Multi-golem orchestration! RecruiterGolem + ContentGolem collaborate. Token-intensive, needs `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. |
| **TeammateIdle + TaskCompleted hooks** | 2.1.33 | ClaudeGolem gets notified when RecruiterGolem finishes. Could replace event-log.ts notification pattern entirely. |
| **PreToolUse → additionalContext** | 2.1.33 | Inject golem-specific context before tool calls. E.g., inject style card before any write operation, or inject anti-AI rules before outreach generation. |
| **MCP OAuth** | 2.1.30 | `claude mcp add --client-id --client-secret`. Easier Gmail OAuth setup for EmailGolem install wizard. |
| **Remote sessions in VSCode** | 2.1.33 | Browse/resume golem sessions from claude.ai. Mobile monitoring potential. |
| **Skill budget scales with context** | 2.1.32 | 2% of context window. Our 34 skills now have more room to show descriptions. |

### NICE-TO-HAVE

| Feature | Note |
|---------|------|
| PDF pages parameter | TellerGolem reading tax docs |
| Bash heredoc fix | JS template literals in bash no longer break |
| /resume session titles | Clean titles instead of XML markup |

### Key Architecture Impact

1. **Agent Memory replaces parts of event-log.ts** - Built-in `memory: project` means golems auto-remember without our custom injection code. But keep curated learnings (learn-mistake skill) - auto-memory catches "what happened", learnings catch "what we decided". Both are valuable.
2. **Agent Teams = golem collaboration** (not Ralph replacement) - Ralph = solo autonomous loop. Teams = multi-golem collab (RecruiterGolem + ContentGolem draft together). When Teams stabilizes, Ralph could dispatch to teams internally.
3. **Hook events enable reactive golems** - `TaskCompleted` means ClaudeGolem can react to any golem finishing work. True event-driven architecture. The missing piece for golem collaboration.
4. **PreToolUse context injection** - Per file type:
   - `.he.tsx` → RTL + TypeScript + React + possibly Next.js rules
   - `.tsx` → TypeScript + React (no RTL)
   - `.native.tsx` → React Native / Expo rules
   - Any write in RecruiterGolem → "no em dashes, match recipient tone" anti-AI rules
5. **Auto-inject plugins per project** - Plugins like `frontend-design` provide skills but don't auto-activate. Use PreToolUse hook to inject plugin context automatically based on project:
   - `domica`, `songscript`, `etanheyman.com` → auto-inject `frontend-design` + `web-design-guidelines` rules on any UI file edit
   - `domica` → also inject RTL rules (already in CLAUDE.md, but plugin adds opinionated design critique on top)
   - `golems/recruiter-golem` → auto-inject anti-AI outreach style
   - Implementation: PreToolUse hook checks project root / file extension → reads relevant plugin skill files → returns as `additionalContext`
   - Alternatively: per-project `.claude/settings.json` with `autoInjectPlugins: ["frontend-design"]` (if CC adds this)

### Frontend Design Plugin (INSTALLED - 2026-02-06)

`claude plugin install frontend-design` - Official Anthropic plugin.
Forces bold, production-grade UI instead of generic AI slop.
- No Inter/Roboto defaults, no purple gradients
- Distinctive typography, cohesive palettes, real animations
- Spatial composition, grid-breaking, context-specific character

**Use for:** etanheyman.com, domica, songscript, any frontend work.

---

## Part 20: Documentation, Wizard & Admin (2026-02-06)

> Added after Phase 2 code complete. Tracks 10-14 cover discoverability, setup UX, and centralization.

### Centralization Principle

**Everything must be easy to find and manage** — for humans, for Claude, for any tooling:

| What | Where | NOT scattered across |
|------|-------|---------------------|
| **Runtime state** | `~/.golems-zikaron/` (local) or Supabase (cloud) | ~/random dirs, /tmp |
| **Secrets** | 1Password (source of truth) → env vars | .env files, hardcoded |
| **Config** | `CLAUDE.md` hierarchy (global → repo → package) | Random dotfiles |
| **Docs (public)** | `docs/` in repo root | docs.local (working drafts only) |
| **Skills** | `packages/ralph/skills/golem-powers/` (symlinked to ~/.claude/commands/) | Duplicated across packages |
| **Learnings** | `~/.claude/learnings/` (global) + `docs.local/learnings/` (project) | Scattered .md files |
| **Plans** | `docs/golems-v2-branding-plan.md` (canonical) | Multiple copies in docs.local |

The wizard (Track 12) and docs (Track 11) must enforce this — every setup produces the same predictable layout.

### Track 10: Storage Audit

**File:** `scripts/storage-audit-prompt.md`
- 7-phase non-destructive audit: disk overview, ghost detection, staleness, recurring growers, large files, Android SDK, browsers
- Runs **pre-setup** (baseline) and **post-setup** (cleanup redundant local state)
- Outputs structured markdown: "delete / keep because X" categories
- Never deletes anything — audit and recommend only

### Track 11: Documentation Site

**Stack:** Docusaurus or MkDocs
**Sections:**
1. Getting Started — what Golems is, what it changes on your system
2. Phase 1 — email routing, reply drafting, follow-ups, content pipeline
3. Phase 2 — cloud offload (Railway, Supabase, Haiku, env vars)
4. Per-Golem Guides — RecruiterGolem, TellerGolem, ContentGolem, ClaudeGolem
5. MCP Servers — zikaron, golems-email, golems-jobs
6. Configuration Reference — all env vars, 1Password items, launchd plists
7. Architecture — domain golems principle (Part 14)

**Build workflow:** Parallel Haiku-powered Claude Code agents draft sections, main agent reviews/organizes. Cursor CLI `@codebase` for automated codebase mapping.

### Track 12: Golem CLI Wizard (`golems setup`)

Interactive setup for new projects or new Macs. Modular — user picks which services to enable.

**Each step explicitly tells the user:**
- What it will do
- Disk/network/system impact
- Permissions needed
- Risks and how to rollback
- Asks for confirmation even on bypass mode

**Phases:** Pre-flight audit → Core setup → Service selection → 1Password secrets → Deploy (Railway or launchd) → Verify → Post-flight audit

**Output:** `SETUP_LOG.md` documenting exactly what was configured.

### Track 13: Coverage Sweep

Final pass after all other tracks:
- Cursor CLI `@codebase` full mapping
- Cross-reference docs vs actual code
- Find undocumented env vars, MCP tools, skills
- Fill gaps, remove stale references

### Track 14: Golem Admin UI (`@golems/admin`)

**Package:** `packages/admin-ui`
- Embeddable React admin interface
- Shows: golem status, event log, API usage/costs, outreach pipeline, email routing
- Reads from Supabase (cloud) or local state (file)
- Publishable as `@golems/admin` — drop into any website
- Standalone (Vite) or embeddable component

---

## Research References

| Document | Location | Contents |
|----------|----------|----------|
| **CC 2.1 Full Audit** | `docs.local/research/claude-code-2.1-golems-audit.md` | CC v2.0.67→v2.1.33 analysis: 14 adopt-now, 6 deprecation risks, 8 watch items, 7 new capabilities |
| **Avi Lewis Prompt Stack** | `docs.local/avi_lewis/linkedin_post_3.md` | 10-step Claude workflow from Meta engineer. Basis for `/task-stack` skill |
| **Israeli Companies Hiring** | `docs.local/avi_lewis/linkedin_post_2.md` | Curated TLV companies hiring list (from Goozali creator) |
| **AI Impact on Engineering** | `docs.local/avi_lewis/linkedin_post_1.md` | Code review as moat, AI-assisted interviews at Meta, .MD as competitive advantage |
| **Obsidian Research** | `$OBSIDIAN_VAULT/Projects/Golems/Ideas/JobGolem/` | Waves 1-8 of async research (filtering, sources, verification) |

---

## Appendix: Path Variables

> Internal path variables used throughout this document.

| Variable | Description |
|----------|-------------|
| `$GOLEMS_DATA` | Runtime state directory (state.json, event-log, job-golem data) |
| `$OBSIDIAN_VAULT` | Obsidian research vault |
