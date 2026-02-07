# Phase 1: Ship What's Built

**Status:** ✅ DONE | **PRs:** #7, #8 | **Tests:** 333 pass

## What Was Built
- 8 PR#7 bug fixes (unreachable contacts, shared-types, Hebrew seeds, numpy guard, logger, job_match events)
- Email routing: emails → domain golems by category
- Reply drafting: template-based by intent (accept/decline/interested/followup)
- Follow-up tracking: category-based due dates
- Agent runner: unified multi-model runner
- Content skill: merged soltome + soltome-influencer
- Pre-commit hook: `bun test --bail` on staged .ts files

## Key Files
- `src/lib/shared-types.ts` - Canonical types
- `src/lib/agent-runner.ts` - Multi-model runner
- `src/email-golem/router.ts` - Email → golem routing
- `src/email-golem/draft-reply.ts` - Reply generation
- `src/email-golem/followup.ts` - Follow-up tracking

## Architectural Decisions
- **Golems = domain experts, not I/O channels** (Part 14)
- **GolemActors:** recruitergolem, tellergolem, claudegolem, emailgolem
- **Event types:** email_routed
