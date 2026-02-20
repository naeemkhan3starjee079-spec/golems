# Delegation Prompts for Package Claudes

> Paste these to fresh Claude instances in each package directory.
> Each Claude will use local context + these instructions.

---

## 1. Ralph Package (`golems/packages/ralph/`)

```
You're working on Ralph - the autonomous AI coding loop.

## Your Task
Improve the README and documentation based on the audit at:
`docs.local/audit-haiku-1-readme-gaps.md` (760 lines of gaps)

## Priority Items (broader scope)
1. **Environment Variables Reference** - Document all 50+ RALPH_* vars
2. **Comprehensive Flag Reference** - All CLI flags with examples
3. **Config File Examples** - Annotated config.json, registry.json
4. **Smart Model Routing** - Explain story prefix → model mapping
5. **Worktree Usage Guide** - ralph-start/cleanup workflow
6. **Notification Setup** - ntfy step-by-step
7. **Cost Estimation** - How to track/estimate costs
8. **Parallel Verification** - V-* story documentation
9. **Monorepo Support** - Multi-app workflows
10. **1Password Integration** - Secret management guide

## Context Files to Read
- `README.md` (current state)
- `docs.local/audit-haiku-1-readme-gaps.md` (gap analysis)
- `lib/*.zsh` (for env vars, flags)
- `ralph.zsh` (main entry point)
- `ralph-ui/src/` (TypeScript flags)

## Output
Update README.md with new sections. Be comprehensive but scannable.
Add code examples, tables, and diagrams where helpful.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Ralph README Done","body":"Documentation updated","source":"claude"}'
```

---

## 2. BrainLayer (External Repo — formerly Zikaron)

> BrainLayer has been extracted to its own repo: https://github.com/EtanHey/brainlayer
> Install: `pip install brainlayer` or `pip install git+https://github.com/EtanHey/brainlayer.git`

---

## 3. Autonomous Package (`golems/packages/autonomous/`)

```
You're working on the autonomous bot system (formerly golems-zikaron).
This includes Telegram bot, Night Shift, Moltbook integration, and job-golem.

## Your Task
Document the bot architecture:
1. **2 Telegram Bots**:
   - NotifyBot: Pings from Claude/Ralph
   - OllamaChat: Direct Ollama interaction (user can chat, messages queue if busy)
2. **Dashboard** (future): Web/widget/app for job recs, draft approval
3. **Night Shift**: 3am autonomous work
4. **Job Golem**: Job collection and matching
5. **Moltbook**: Autonomous social presence

## Context Files to Read
- `README.md` (current state)
- `src/telegram-bot.ts` (main bot)
- `src/night-shift.ts` (autonomous work)
- `src/briefing.ts` (8am briefings)
- `src/job-golem/` (job matching)
- `src/moltbook-*.ts` (Moltbook integration)
- `SOUL.md` (bot personality)

## Architecture to Document
- Ollama has "a life of its own" - autonomous Moltbook presence
- User messages queue if Ollama is busy
- Validation queue: pending/ → Claude reviews → approved/
- Draft posts wait for user approval before posting

## Output
Update README.md with architecture diagrams, bot interactions, and setup instructions.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Autonomous README Done","body":"Documentation updated","source":"claude"}'
```

---

## 4. Continuation Prompt (For Later Ideas)

```
You're continuing the Golem ecosystem planning session.

## Previous Context
We've planned:
1. Monorepo consolidation (golems/)
2. 2 Telegram bots (NotifyBot + OllamaChat)
3. Dashboard (web/widget/app) for job recs, draft approval
4. Sandboxed Ollama with Claude validation
5. Night Shift creative improvements to dashboard

## Questions to Explore

### Dashboard Tech Stack
- Web app (React/Next.js)?
- iOS widget?
- Expo app for cross-platform?
- Simple static site with API?

### Ollama Off-Hours Schedule
- When is "off work" for autonomous dashboard building?
- Night shift is 3am - should dashboard work be separate?
- How long should Ollama work on dashboard each session?

### Night Shift Dashboard Improvements
- What counts as "1 creative improvement"?
- Push directly to master or branch?
- Human review needed or fully autonomous?

### OllamaChat Queue Behavior
- Show "busy, will respond soon" status?
- Priority for certain message types?
- Timeout for queued messages?

### Job Recommendations in Dashboard
- How to persist/refresh job listings?
- Filtering criteria configurable?
- Integration with job-golem output?

## Output
Think through these questions, propose solutions, and document decisions.
Save to `~/Gits/golems/docs/future-ideas.md` or similar.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Ideas Session Done","body":"Future plans documented","source":"claude"}'
```

---

## Usage

1. Open terminal in each package directory
2. Run `claude` (or `repoGolem <name>` if configured)
3. Paste the relevant prompt
4. Let it work, you'll get Telegram notifications when done

---

---

## 5. EtanHey GitHub Profile (`~/Gits/EtanHey/`)

```
You're updating Etan's GitHub profile README.

## Your Task
Create/update the profile README to showcase recent work, especially:
1. **Union contributions** (647 commits) - Real estate platform work
2. **Golems ecosystem** - Ralph, Zikaron, autonomous bots
3. **Domica** - Property platform (keep details vague, it's stealth)
4. **Songscript** - Music/audio project

## Structure
- Brief intro
- Current focus / what I'm building
- Notable projects with descriptions
- Tech stack badges
- Contribution graph context

## Style
- Casual, not corporate
- Show personality
- Link to live projects where possible

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"GitHub Profile Done","body":"README updated","source":"claude"}'
```

---

## 6. Domica (`~/Gits/domica/`)

```
You're documenting Domica - a property/real estate platform (STEALTH MODE).

## Your Task
Create internal documentation for developers. Keep it useful but don't expose business logic.

## What to Document
1. Project structure (apps/, packages/)
2. Tech stack (Next.js, Expo, Supabase, etc.)
3. Local dev setup
4. Key components and patterns
5. Environment variables needed

## IMPORTANT: Stealth Rules
- NO business strategy or roadmap
- NO competitive analysis references
- NO user metrics or traction
- Keep feature descriptions generic
- Use spoiler tags or [REDACTED] for sensitive parts

## Output
Update/create README.md with setup instructions and architecture overview.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Domica Docs Done","body":"Internal docs updated","source":"claude"}'
```

---

## 7. Songscript (`~/Gits/songscript/`)

```
You're documenting Songscript - a music/audio processing project.

## Your Task
Create comprehensive README covering:
1. What it does (transcription, analysis, etc.)
2. Tech stack (WhisperX, Python, etc.)
3. Installation and setup
4. CLI usage examples
5. Integration with other projects

## Context Files to Read
- Existing README.md
- scripts/ folder
- Any Python files for understanding the pipeline

## Output
Update README.md with clear documentation and examples.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Songscript Docs Done","body":"README updated","source":"claude"}'
```

---

## 8. Rudy Monorepo (`~/Gits/rudy-monorepo/`)

```
You're documenting Rudy - a monorepo project.

## Your Task
Create/update documentation:
1. Monorepo structure (apps/, packages/)
2. What each app does
3. Shared packages
4. Local dev setup
5. Deployment info

## Context Files to Read
- README.md
- package.json files
- App folders

## Output
Clear README with architecture overview and setup instructions.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Rudy Docs Done","body":"README updated","source":"claude"}'
```

---

## 9. etanheyman.com (`~/Gits/etanheyman.com/`)

```
You're documenting the personal website.

## Your Task
Document:
1. Tech stack
2. Local dev setup
3. Deployment process
4. Content structure

## Output
README with setup and deployment instructions.

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"Website Docs Done","body":"README updated","source":"claude"}'
```

---

## 10. ML Detectors Consolidation (`~/Gits/`)

```
You're consolidating two related ML projects:
- unified-detector-client
- hand-sign-detection

## Your Task
1. Analyze both repos - what do they do?
2. Identify overlap and differences
3. Propose consolidation strategy:
   - Merge into one repo?
   - One as dependency of other?
   - Keep separate with shared utils?
4. Document the recommendation

## Output
Create `~/Gits/golems/docs/ml-detector-consolidation.md` with:
- Analysis of both repos
- Recommended approach
- Migration steps if consolidating

When done, notify via:
curl -X POST http://localhost:3847/notify -H "Content-Type: application/json" \
  -d '{"title":"ML Analysis Done","body":"Consolidation plan ready","source":"claude"}'
```

---

## Before Switching LaunchAgents

**BLOCKER:** The monorepo needs setup before LaunchAgents can point to new paths:

1. **BrainLayer installed:**
   ```bash
   pip install brainlayer  # or: pip install git+https://github.com/EtanHey/brainlayer.git
   brainlayer-mcp --help   # Verify MCP server works
   ```

2. **Autonomous package dependencies:**
   ```bash
   cd ~/Gits/golems/packages/autonomous
   bun install
   ```

3. **Test before switching:**
   ```bash
   # Test brainlayer MCP
   brainlayer-mcp

   # Test telegram bot
   bun ~/Gits/golems/packages/autonomous/src/telegram-bot.ts
   ```

4. **Then update LaunchAgents** (after verification)

---

*Generated: 2026-02-02*
