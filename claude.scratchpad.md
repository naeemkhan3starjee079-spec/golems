# Morning TODOs (2026-02-07)

## What Got Done Tonight
- Plan restructured: `docs/plan/` folder with phase READMEs + executable TODOs
- DeepSource config: `.deepsource.toml` committed (will auto-run on PRs)
- Skills catalog: `golems skills` CLI command + `available-skills.json` (11 tools)
- Highlight.io scaffold: `src/lib/highlight-client.ts` (lazy init, no SDK dep yet)
- TODO marker added to `available-skills.json` for replacing soydev.link with our docs link

## PR #29 (Open, Ready to Merge)
`feature/phase4-tooling-integrations` — CodeRabbit reviewed, suggestions are style-only (skip).
Action: **Merge it.**

## Your Action Items
1. **Sign up at [exa.ai](https://exa.ai)** — get API key, store in 1Password as `EXA_API_KEY`
2. **Create [Highlight.io](https://highlight.io) account** — get project ID, set `HIGHLIGHT_PROJECT_ID` env var
3. **Merge PR #29** — `gh pr merge 29 --squash`
4. **Review dependabot PRs** (major version bumps, may break things):
   - #13: ts-jobspy 1.4 to 2.0
   - #23: vite 6 to 7
   - #24: chromadb 0.4 to 1.4
   - #26: @vitejs/plugin-react 4 to 5

## Code TODOs (Next Session)
- Wire Exa MCP into `contact-finder.ts` for company lookups (needs API key first)
- Instrument `cloud-worker.ts` + `telegram-bot.ts` with Highlight.io (needs project ID first)
- Phase 2 deploy: push `feature/phase2-cloud-offload`, create PR, deploy to Railway
- Pre-existing test failures (57) need investigation — practice-db, state-store, event-log

## Plan Status
See `docs/plan/README.md` for full progress (26/33 parts done, 79%)
