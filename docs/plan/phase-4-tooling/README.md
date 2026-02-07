# Phase 4: Tooling Integrations

**Status:** 🏗️ ACTIVE | **Branch:** feature/phase4-tooling-integrations

## Execution Order

Run in this order. Items in the same wave can run in parallel.

### Wave 1: Quick Wins (parallel, ~2hrs total)

#### TODO-1: DeepSource (Part 29) — S
- [x] `.deepsource.toml` created locally
- [ ] Commit and push `.deepsource.toml`
- [ ] Verify DeepSource runs on PR
- [ ] If working: delete `.github/dependabot.yml`
- **Files:** `.deepsource.toml` (new), `.github/dependabot.yml` (delete after)

#### TODO-2: Plan Restructure (Part 33) — M
- [x] Create `docs/plan/` folder structure
- [x] Write README.md progress index
- [x] Write phase READMEs (archived phases)
- [x] Write phase-4 README with TODOs (this file)
- [ ] Commit all plan files
- [ ] Update MEMORY.md with new plan location

### Wave 2: Integrations (parallel, ~4hrs total)

#### TODO-3: Exa MCP (Part 31) — M
- [ ] Sign up at exa.ai, get API key
- [ ] Store key: `op item create --category=apiCredential --title="EXA_API_KEY"`
- [ ] Add to `.mcp.json`: exa MCP server config
- [ ] Test: search for a company via MCP tool
- [ ] Wire into `src/recruiter-golem/contact-finder.ts` for company lookups
- [ ] Add to `data/available-skills.json` catalog
- **Files:** `.mcp.json` (modify), `contact-finder.ts` (modify), `available-skills.json` (new)
- **Dependency:** Exa API key (need user to sign up or provide key)

#### TODO-4: Highlight.io (Part 30) — M
- [ ] Create Highlight.io account (free tier, 500 sessions/mo)
- [ ] Get project ID
- [ ] `cd packages/autonomous && bun add @highlight-run/node`
- [ ] Create `src/lib/highlight-client.ts` — init SDK, export `H`
- [ ] Instrument `src/cloud-worker.ts` — wrap with H.init(), add error tracking
- [ ] Instrument `src/telegram-bot.ts` — session tracking
- [ ] Add `HIGHLIGHT_PROJECT_ID` to Railway env vars
- [ ] Verify events appear in Highlight dashboard
- [ ] Keep `event-log.ts` as fallback (don't delete yet)
- **Files:** `highlight-client.ts` (new), `cloud-worker.ts` (modify), `telegram-bot.ts` (modify), `package.json` (modify)
- **Dependency:** Highlight account + project ID

### Wave 3: Catalog (sequential, ~3hrs)

#### TODO-5: Skills Discovery Catalog (Part 32) — M
- [ ] Create `data/available-skills.json` with schema:
  ```json
  {
    "skills": [{
      "name": "string",
      "description": "string",
      "category": "code-review|monitoring|search|deployment|testing|browser-automation|git-workflow",
      "free_tier": "string (e.g. '500 sessions/mo')",
      "setup_complexity": "S|M|L",
      "relevant_project_types": ["typescript", "python", "expo", "etc"],
      "url": "string",
      "status": "active|planned|evaluation"
    }]
  }
  ```
- [ ] Populate with: CodeRabbit, DeepSource, Highlight, Exa, Blacksmith, Browserbase, Graphite, Cursor BugBot
- [ ] Add `golems skills list` command to `bin/golems`
- [ ] Create `src/skills-list.ts` — reads JSON, prints table
- [ ] Reference soydev.link as community resource
- **Files:** `data/available-skills.json` (new), `src/skills-list.ts` (new), `bin/golems` (modify)

## Done When
- [ ] All 5 TODOs complete
- [ ] PR created, CodeRabbit reviewed, merged
- [ ] `bun test` passes (helpers tests + any new tests)
- [ ] MEMORY.md updated with Phase 4 completion

## Notes
- TODO-3 and TODO-4 need external accounts (Exa, Highlight) — can proceed with config/code, test later
- DeepSource is already configured in the dashboard, just needs the toml in repo
- Skills catalog feeds into the wizard (future Phase 5 work)
