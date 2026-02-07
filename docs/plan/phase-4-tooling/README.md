# Phase 4: Tooling Integrations

**Status:** 🏗️ ACTIVE | **Branch:** feature/phase4-tooling-integrations, feature/remaining-plan-items

## Standard Checklist (EVERY TODO must complete ALL steps)

Every plan item follows this lifecycle:

1. **Implement** — Write the code (TDD: tests first)
2. **Test** — All new tests pass, existing tests unbroken (`bun test`)
3. **TSDoc** — Every exported function has TSDoc comments
4. **Document** — Update relevant docs (plan README, CLAUDE.md, MEMORY.md)
5. **Audit** — Run verification: `cursor agent "Audit {files} for test coverage, TSDoc, and edge cases" --model gpt-5.2-codex-xhigh --output-format text`
6. **Commit** — Descriptive commit message, `--no-verify` only if pre-existing failures
7. **Keep going** — Move to next TODO. Don't stop. Autopilot hook will remind you.

---

## Wave 1: Quick Wins ✅ DONE

#### TODO-1: DeepSource (Part 29) — S ✅ DONE
- [x] `.deepsource.toml` created and committed (PR #29)
- [x] Verified in PR pipeline
- [ ] ~Delete `.github/dependabot.yml`~ (keeping for now, DeepSource complements)

#### TODO-2: Plan Restructure (Part 33) — M ✅ DONE
- [x] `docs/plan/` folder structure created
- [x] Phase READMEs written
- [x] MEMORY.md updated

---

## Wave 2: Integrations

#### TODO-3: Exa MCP (Part 31) — M 📋 BLOCKED
- [ ] Sign up at exa.ai, get API key
- [ ] Store key: `op item create --category=apiCredential --title="EXA_API_KEY"`
- [ ] Add to `.mcp.json`: exa MCP server config ← config already added locally
- [ ] Test: search for a company via MCP tool
- [ ] Wire into `src/recruiter-golem/contact-finder.ts` for company lookups
- [ ] **TEST:** Unit test for Exa integration in contact-finder
- [ ] **TSDOC:** All new exports documented
- [ ] **AUDIT:** `cursor agent "Audit contact-finder.ts Exa integration" --model gpt-5.2-codex-xhigh`
- **Dependency:** Exa API key (user must sign up)
- **Files:** `.mcp.json`, `contact-finder.ts`, `available-skills.json`

#### TODO-4: Highlight.io (Part 30) — ❌ CANCELLED
- Service shutting down Feb 28 2026, absorbed by LaunchDarkly
- Scaffold was built and then deleted
- **Action needed:** Find replacement (Sentry, Axiom, or Grafana Cloud)

---

## Wave 3: Catalog ✅ DONE

#### TODO-5: Skills Discovery Catalog (Part 32) — M ✅ DONE
- [x] `src/available-skills.json` with 11 tools across 7 categories
- [x] `src/skills-list.ts` — table, compact, filter modes
- [x] `golems skills` command in bin/golems
- [x] TODO marker for replacing soydev.link with our docs link

---

## Wave 4: Shared Utilities

#### TODO-6: System Detection Shared Library — M ✅ DONE
- [x] `src/lib/system-detect.ts` — 9 detection functions
- [x] Tests: 26 tests, 63 assertions
- [x] TSDoc on all exports
- [x] Committed at `85772c1`

#### TODO-7: Autopilot Mode — S ✅ DONE
- [x] Stop hook: `~/.claude/hooks/keep-going.py`
- [x] Safety: self-disables after 15 consecutive blocks
- [x] Toggle: `golems autopilot on/off/status`
- [x] Committed at `370ae9f`

---

## Remaining Plan Items (from earlier phases, built in this batch)

#### Part 2: Plugin Architecture — M ✅ DONE
- [x] `src/lib/plugin-loader.ts` — loadPlugins, matchPlugins, injectContext
- [x] `src/plugins/frontend-design.json`, `database.json`
- [x] Tests: 14 tests, 37 assertions
- [x] **TEST:** ✅ | **TSDOC:** ✅ | **AUDIT:** Pending verification sweep
- [x] Committed at `0cec71f`

#### Part 4: Outreach → Obsidian — M ✅ DONE
- [x] `src/recruiter-golem/obsidian-export.ts` — contacts, companies, outreach as markdown
- [x] Wikilinks, frontmatter, tags for Obsidian compatibility
- [x] CLI: `bun run src/recruiter-golem/obsidian-export.ts --output ~/vault/`
- [x] Tests: 10 tests, 61 assertions
- [x] **TEST:** ✅ | **TSDOC:** ✅ | **AUDIT:** Pending verification sweep
- [x] Committed at `b007948`

#### Part 5: Session Forking (Telegram) — S ✅ DONE
- [x] `src/lib/session-fork.ts` — forkSession, detectComplexTask, extractTaskName
- [x] `/fork` command in telegram-bot.ts + auto-detection with inline keyboard
- [x] Tests: 24 tests, 46 assertions
- [x] **TEST:** ✅ | **TSDOC:** ✅ | **AUDIT:** Pending verification sweep
- [x] Committed at `3bae99d`

#### Part 11: Playwright E2E Testing — M ✅ DONE
- [x] `packages/e2e/` with playwright.config.ts
- [x] Smoke tests for admin-ui and docsite
- [x] `golems e2e` command in bin/golems
- [x] **TEST:** Scaffold only (tests run when dev servers are up)
- [x] **TSDOC:** N/A (test files) | **AUDIT:** Pending verification sweep
- [x] Committed at `6e7b4ae`

#### Part 12: WhatsApp Semantic Search — M ✅ DONE
- [x] `src/lib/whatsapp-parser.ts` — parse WhatsApp .txt export (12h + 24h formats)
- [x] `src/lib/whatsapp-indexer.ts` — send chunks to Zikaron via CLI
- [x] `src/whatsapp-index-cli.ts` — CLI entry point
- [x] `golems index-whatsapp` command in bin/golems
- [x] Tests: 22 tests, 52 assertions
- [x] **TEST:** ✅ | **TSDOC:** ✅ | **AUDIT:** Pending verification sweep
- [x] Committed at `cbe2d27`

---

## Final Steps (after all TODOs done)

- [ ] **Verification sweep**: Run `cursor agent` audit on ALL new files in this batch
- [ ] **Update plan README**: Mark everything final
- [ ] **Create PR**: All commits on `feature/remaining-plan-items`
- [ ] **CodeRabbit review**: Fix real bugs only (skip style suggestions)
- [ ] **Merge**: Squash merge to master
- [ ] **Zikaron migrate**: Run `zikaron migrate` in background to index new conversations while user sleeps
- [ ] **Notify**: Telegram with final status
- [ ] **Autopilot off**: `golems autopilot off`

## Notes
- TODO-3 (Exa) blocked on API key — user action needed
- TODO-4 (Highlight.io) CANCELLED — find replacement later
- System detection is shared foundation for wizard + doctor + janitor
- All "Pending verification sweep" items get audited in Final Steps
