# Phase 5: CC Plugin Packaging

> [Back to main plan](../README.md)

## Goal
Package each golem as a Claude Code plugin with plugin.json, CLAUDE.md, commands, skills, and MCP tools.

## Tools
- **Research:** gemini — CC plugin best practices, marketplace format
- **Code:** Opus — write CLAUDE.md personas, skill descriptions, command files
- **Verify:** `claude --plugin-dir ./packages/recruiter` — test each plugin locally

## Steps

1. **[Cursor work]** Create `.claude-plugin/plugin.json` for each golem
   ```json
   { "name": "recruiter-golem", "description": "...", "version": "1.0.0", "author": "EtanHey" }
   ```
2. **[Gemini research]** CC plugin best practices — marketplace format, what fields matter
3. **[Opus]** Write CLAUDE.md for each golem (personality, context, capabilities)
   - RecruiterGolem: interview practice (7 modes), outreach pipeline, Elo tracking
   - TellerGolem: expense categorization, tax reports, subscription tracking
   - JobGolem: job matching, ATS scraping, pipeline management
   - ContentGolem: LinkedIn writing, teaching loop, style learning, Soltome
   - CoachGolem: daily schedule, Google Calendar, life planning
   - ClaudeGolem: orchestrator personality, SOUL.md integration
4. **[Opus]** Create commands/ for each golem (user-invokable)
   - RecruiterGolem: practice.md, outreach.md, stats.md, followup.md
   - TellerGolem: report.md, categorize.md
   - JobGolem: search.md, matches.md
   - ContentGolem: draft.md, teach.md, learn.md
   - CoachGolem: plan.md, today.md, check.md
5. **[Opus]** Create skills/ for each golem (auto-invoked by context)
   - RecruiterGolem: interview-prep/SKILL.md
   - ContentGolem: linkedin/SKILL.md
   - CoachGolem: daily-routine/SKILL.md
6. **[Cursor work]** Create `.mcp.json` for each golem pointing to own MCP server
   - Each golem exposes ONLY its own tools
   - No cross-golem MCP imports
7. **[manual]** Test each plugin locally: `claude --plugin-dir ./packages/<golem>`
8. **[manual]** Verify namespaced commands work: `/recruiter:practice`, `/teller:report`, etc.
9. **[Opus]** Create CLI aliases per golem in `.zshrc`
   - `recruiterClaude`, `tellerClaude`, `jobsClaude`, `contentClaude`, `coachClaude`
   - Same pattern as existing `repoClaude`/`domicClaude` aliases
   - Support `-s` (fresh session), `-c` (continue), `-u` (use session ID)
   - Each alias: `claude --plugin-dir ./packages/<golem> $@`

## Depends On
- Phase 4 (packages must exist as workspaces before adding plugin metadata)

## Status
- [ ] Create plugin.json for each golem
- [ ] Write CLAUDE.md per golem
- [ ] Create commands/ per golem
- [ ] Create skills/ per golem
- [ ] Create .mcp.json per golem
- [ ] Test each plugin locally
- [ ] Verify namespaced commands
