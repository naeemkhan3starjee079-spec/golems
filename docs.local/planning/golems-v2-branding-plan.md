# Golems v2: Branding, Packaging & Strategic Plan

> Created: 2026-02-05
> Context: Claude Code plugins, memory updates, agent teams, marketplace positioning
> Status: DRAFT - Needs user review

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
| **Skills/Commands** | `.claude/skills/` + plugin system | `~/.claude/commands/golem-powers/` | Should migrate to plugin format |
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
  ✓ Creating ~/.golems-zikaron/
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
SQLite DB at `~/.golems-zikaron/recruiter/outreach.db`

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
- `~/.golems-zikaron/style/semantic-style-data.json` ✅ (loaded by style-adapter.ts)
- Zikaron archives at `~/Gits/zikaron/data/archives/style-*/` ✅

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
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/personal/
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

34 skills dumped in `~/.claude/commands/golem-powers/` with no clear categorization.
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
| 4 | Portable style summary for Claude.ai | 30min | MEDIUM | |
| 5 | `golems doctor` enhanced monitoring | 2h | MEDIUM | |
| 3 | Obsidian outreach integration | 2h | HIGH | |
| 6 | Plugin architecture migration | 4h | MEDIUM | |
| 7 | Install wizard (npx golems-cli) | 4h | HIGH for branding | |
| 11 | TellerGolem (full build) | 4h | HIGH - tax season | |
| 2 | Notification channel (dropped - iOS 26 APNs bug) | — | — | DROPPED |
| 8-18 | (rest unchanged) | | | |

---

## Post-Compaction Instructions

When resuming after compaction:
1. Read this plan file FIRST
2. Check `@packages/zikaron/docs/showcase-claude-collab-discovery.md` for collab patterns
3. Check Obsidian Ideas folder for deep research context
4. Ask user questions after seeing how Obsidian data can help
5. The user wants all new golems/addons to be wired into the system automatically
