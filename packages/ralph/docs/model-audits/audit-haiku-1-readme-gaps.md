# Claude-Golem Documentation Gaps

Generated: 2026-01-26

## Critical Missing Sections

### 1. Environment Variables Reference
**What's Missing:**
Complete reference of all RALPH_* environment variables with descriptions.

**Current State:**
- README mentions a few (RALPH_ITERATIONS, RALPH_MODEL, etc.)
- Majority of variables undocumented
- No distinction between user-configurable vs internal

**Found 50+ variables:**
- User-configurable: RALPH_CONFIG_DIR, RALPH_DEFAULT_MODEL, RALPH_NTFY_TOPIC
- Runtime: RALPH_SESSION, RALPH_ITERATIONS, RALPH_MODEL
- Internal: RALPH_SCRIPT_DIR, RALPH_LIB_DIR, RALPH_WATCHER_PID
- UI: RALPH_COLOR_SCHEME, RALPH_LIVE_ENABLED
- Advanced: RALPH_PARALLEL_AGENTS, RALPH_DEBOUNCE_MS

**Impact:**
- Users cannot troubleshoot environment-related issues
- Cannot debug hangs or performance problems
- Advanced users cannot tune system behavior

**Solution:**
Create new section:
```markdown
## Environment Variables Reference

### User Configuration
- RALPH_CONFIG_DIR - Configuration directory (default: $HOME/.config/ralphtools)
- RALPH_DEFAULT_MODEL - Default model for execution
- RALPH_NOTIFY_ENABLED - Enable notifications
- RALPH_NTFY_PREFIX - Prefix for notification topics
- RALPH_NTFY_TOPIC - Specific ntfy topic

### Runtime Variables (Set by Ralph)
- RALPH_SESSION - Session ID for current execution
- RALPH_ITERATIONS - Number of iterations to run
- RALPH_SLEEP_SECONDS - Gap between iterations
- RALPH_MODEL - Current model being used
- RALPH_NOTIFY - Enable notifications flag

### Advanced Configuration
- RALPH_MODEL_STRATEGY - single vs smart routing
- RALPH_PARALLEL_VERIFICATION - Enable parallel agents
- RALPH_PARALLEL_AGENTS - Number of agents (1-5)

### Internal (Do Not Modify)
[List with descriptions]
```

---

### 2. Comprehensive Flag Reference
**What's Missing:**
Complete documentation of all CLI flags.

**Current State:**
README documents some flags but not all:
- Missing: `--pty`, `--no-pty`, `--mode`, `--prd-path`, `--working-dir`
- Unclear: When to use each flag
- Missing: Flag interactions and conflicts

**Found flags:**
```
ralph.zsh:
  -O, -S, -H, -K, -G, -L - Model selection
  -QN, --notify - Notifications
  -q, --quiet - Quiet mode
  -v, --verbose - Verbose mode
  -V, --version - Version
  --help - Help

ralph-ui (TypeScript):
  --run, -r - Runner mode
  --iterations, -n - Iteration count
  --gap, -g - Sleep between iterations
  --model - Model selection
  --quiet, -q - Quiet mode
  --verbose, -v - Verbose mode
  --notify - Notifications
  --pty - Use PTY
  --no-pty - No PTY
  --mode, -m - Display mode
  --prd-path, -p - PRD path
  --working-dir, -w - Working directory
  --iteration, -i - Current iteration
  --start-time - Start timestamp
  --ntfy-topic - Notification topic
```

**Solution:**
Create comprehensive flags table with:
- Short form, long form
- Arguments required
- Default values
- When to use
- Examples

---

### 3. Configuration File Formats
**What's Missing:**
Detailed examples of config.json and registry.json with annotations.

**Current State:**
- README mentions config.json exists
- No example configs shown
- No explanation of each field
- No guidance on customization

**Solution:**
Add section with:

```markdown
## Configuration Files

### config.json
Located at: ~/.config/ralphtools/config.json

[Show annotated example]
```

---

### 4. Smart Model Routing Explanation
**What's Missing:**
Clear explanation of how story prefixes map to models.

**Current State:**
README shows table but:
- Doesn't explain custom prefixes
- Doesn't show how to override
- Doesn't explain fallback behavior
- Doesn't mention unknownTaskType

**Solution:**
```markdown
## Smart Model Routing

Ralph automatically routes story types to appropriate models:

[Table with story type → model mapping]

### Custom Story Types
If your PRD uses custom story prefixes (e.g., PERF-*, INFRA-*), configure
the fallback model via config.json:

```json
{
  "unknownTaskType": "sonnet"
}
```

### Per-Story Override
Override model for specific story:

```json
{
  "id": "PERF-001",
  "model": "opus"
}
```
```

---

### 5. Worktree Usage Guide
**What's Missing:**
Detailed instructions for using ralph-start and ralph-cleanup.

**Current State:**
README mentions:
- `ralph-start` command exists
- Flags: --install, --dev, --symlink-deps, --1password, --no-env
- No explanation of when to use
- No workflow diagram

**Solution:**
```markdown
## Isolated Sessions with Worktrees

For working on multiple branches or repos in parallel without interfering
with your current environment, use ralph-start:

[Workflow diagram showing: main branch → ralph-start → worktree → changes → ralph-cleanup → merge]

### When to Use
- Working on multiple features in parallel
- Needing a clean environment without node_modules pollution
- Testing changes before merging
- Avoiding conflicts with other development

### Full Example
[Step-by-step example with actual commands]
```

---

### 6. Notification Setup Instructions
**What's Missing:**
Step-by-step guide for ntfy notifications.

**Current State:**
README mentions:
- `ralph 20 -QN` enables notifications
- Requires ntfy
- No setup instructions
- No examples of what notifications look like

**Solution:**
```markdown
## Notifications via ntfy

Get real-time notifications when Ralph completes stories or encounters errors.

### Setup
1. Choose notification topic name (e.g., "my-ralph-jobs")
2. Add to config.json:
```json
{
  "notifications": {
    "enabled": true,
    "ntfyTopic": "my-ralph-jobs"
  }
}
```

3. Visit https://ntfy.sh/my-ralph-jobs in your browser
4. Keep tab open to receive notifications

### CLI Override
```bash
ralph 20 -QN  # Enable even if disabled in config
```

### Example Notifications
[Show actual notification examples]

### Mobile App
Install [ntfy Android](link) or [ntfy iOS](link) app
```

---

### 7. Cost Estimation Guide
**What's Missing:**
Explanation of cost tracking and estimation.

**Current State:**
- Cost tracking exists
- Not mentioned in README
- No examples
- Pricing configuration not explained

**Solution:**
```markdown
## Cost Tracking & Estimation

Ralph tracks token usage and estimates costs for each story.

### View Costs
```bash
ralph-costs  # Show summary
```

### Configure Pricing
By default, Ralph uses Anthropic standard pricing. Override in config.json:

```json
{
  "pricing": {
    "opus": { "input": 15, "output": 75 },
    "sonnet": { "input": 3, "output": 15 },
    "haiku": { "input": 1, "output": 5 }
  }
}
```

### Cost Estimation Before Running
Enable cost warnings before expensive iterations:

```json
{
  "costEstimation": {
    "enabled": true,
    "warnThreshold": 10
  }
}
```

This warns if estimated cost exceeds $10 USD.
```

---

### 8. Parallel Verification (V-* Stories)
**What's Missing:**
Explanation of parallel agent feature for verification stories.

**Current State:**
- Feature exists but not documented
- No examples
- No performance data
- No troubleshooting

**Solution:**
```markdown
## Parallel Verification Stories

For V-* (verification) stories, Ralph can run multiple agents in parallel
to reduce time to completion.

### Configuration
```json
{
  "parallelVerification": true,
  "parallelAgents": 3
}
```

### Use Cases
- Visual regression testing (multiple agents check different areas)
- Cross-browser verification (agents test different browsers)
- Performance testing (agents load-test different components)

### Performance
- 2 agents: ~70% time vs 1 agent
- 3 agents: ~60% time vs 1 agent
- Diminishing returns beyond 5 agents

[Include benchmark data]
```

---

### 9. Monorepo Support
**What's Missing:**
Documentation of monorepo workflows.

**Current State:**
README mentions:
- `ralph <app> N` for monorepo apps
- No examples
- No explanation of structure
- No troubleshooting

**Solution:**
```markdown
## Monorepo Support

Ralph can manage PRDs for multiple apps in a monorepo.

### Structure
```
monorepo/
├── apps/
│   ├── web/
│   │   └── prd-json/
│   └── api/
│       └── prd-json/
├── packages/
│   ├── ui/
│   │   └── prd-json/
```

### Usage
```bash
# Run on web app
ralph web 50

# Run on api
ralph api 30

# Run on shared ui package
ralph ui 20
```

### Configuration
Each app's prd-json/ can have separate config via registry.json.

[Full example with registry.json setup]
```

---

### 10. 1Password Integration
**What's Missing:**
Detailed guide for 1Password secret management.

**Current State:**
README mentions:
- 1Password available
- No setup instructions
- No examples
- No troubleshooting

**Solution:**
Create full guide showing:
- How to set up 1Password environments
- How to store API keys
- How to reference in config
- How to use with MCPs
- Troubleshooting common issues

---

## Medium-Priority Gaps

### 11. CodeRabbit Integration Workflow
**What's Missing:**
Explanation of CodeRabbit review → BUG story creation flow.

**Currently documented:**
- CodeRabbit is integrated
- Max 3 review iterations
- If issues persist, create BUG stories

**Missing:**
- Flow diagram showing how it works
- Examples of CodeRabbit findings
- How to disable CodeRabbit for specific stories
- How to view CodeRabbit reports

---

### 12. Obsidian MCP Setup
**What's Missing:**
Clear step-by-step for Obsidian integration.

**Currently in README but:**
- Instructions are brief
- No troubleshooting section
- No security considerations
- No examples of vault operations

**Add:**
- Installation screenshots
- Configuration examples
- Troubleshooting common issues
- Performance tips

---

### 13. Context Layering System
**What's Missing:**
Detailed explanation of CLAUDE.md context loading.

**Currently:**
README mentions context flow but not clearly.

**Missing:**
- How contexts are loaded
- Which contexts apply to which story types
- How to add custom contexts
- Performance implications of many contexts
- Debugging context issues

---

### 14. PRD JSON Format Reference
**What's Missing:**
Comprehensive PRD JSON schema documentation.

**Currently:**
- docs/prd-format.md exists
- Not linked from README
- No examples in README
- Users must find/read separate doc

**Add to README:**
- Quick reference table
- Common field explanations
- Example story JSON
- Validation rules

---

### 15. Skills System Overview
**What's Missing:**
Clear explanation of available skills and when to use each.

**Currently:**
- /prd, /archive, etc. are mentioned
- No skill directory/index in README
- No "which skill for what task" guide
- No skill installation instructions

**Add:**
```markdown
## Available Skills

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| /prd | Create/manage PRD | Start of work |
| /archive | Archive completed | End of iteration |
| ...

### Finding More Skills
```

---

### 16. Testing & Validation
**What's Missing:**
How to test Ralph before running large iterations.

**Currently:**
- No guidance on testing
- No example test runs
- No validation checklist

**Add:**
```markdown
## Testing & Validation

Before running production iterations:

1. Test with single iteration: `ralph 1`
2. Check terminal compatibility: `ralph-terminal-check`
3. Verify model selection: Review config.json
4. Test one story: Run manually via Claude Code
5. Check PRD format: Run validation script

[Validation checklist]
```

---

### 17. Performance Tuning
**What's Missing:**
How to optimize Ralph for speed.

**Add:**
- Parallelization settings
- PTY vs non-PTY tradeoffs
- Model selection for speed
- Context size optimization
- Storage optimization

---

### 18. Troubleshooting Guide
**What's Missing:**
Comprehensive troubleshooting section.

**Add:**
```markdown
## Troubleshooting

### Ralph hangs or doesn't progress
[Diagnostic steps and solutions]

### Model not available
[Explanation and fixes]

### Notifications not sending
[Setup and testing]

### High costs
[Optimization strategies]

### Performance issues
[Debugging and tuning]
```

---

### 19. Upgrade & Versioning
**What's Missing:**
How to upgrade Ralph and manage breaking changes.

**Currently:**
- No upgrade instructions
- No versioning strategy explained
- No migration guides

**Add:**
```markdown
## Upgrading Ralph

### From v1.x to v2.0
[Migration guide]

### Backup Before Upgrade
[Backup instructions]

### Rollback If Issues
[Rollback procedure]
```

---

### 20. Architecture Overview
**What's Missing:**
High-level explanation of Ralph architecture.

**Add:**
```markdown
## Architecture

[Diagram showing: ralph.zsh → bun ralph-ui → claude CLI → PRD]

### Components
- ralph.zsh: Main entry point and config loading
- lib/*.zsh: Modular utilities
- ralph-ui: React Ink dashboard and iteration runner
- .zsh skills: Integrated workflows

### Data Flow
[Show how data flows through system]

### Execution Model
[Explain fresh context per iteration]
```

---

## Content Gaps by Topic

### Setup & Installation
- [ ] Detailed installation steps for different OS
- [ ] Troubleshooting installation issues
- [ ] Uninstall/cleanup instructions
- [ ] Post-installation verification

### Configuration
- [ ] Example config.json files for common setups
- [ ] Configuration migration from old versions
- [ ] Configuration validation
- [ ] Per-project vs global settings

### Usage Patterns
- [ ] Daily workflow example
- [ ] Multi-person team workflow
- [ ] Handling blocked stories
- [ ] Iterative refinement workflow

### Deployment
- [ ] CI/CD integration
- [ ] Cloud environment setup
- [ ] Credentials management
- [ ] Logging and monitoring

### Debugging
- [ ] How to capture logs
- [ ] Debug mode usage
- [ ] Terminal compatibility debugging
- [ ] Performance profiling

### Contributing
- [ ] How to add skills
- [ ] How to add contexts
- [ ] Testing framework
- [ ] Contribution guidelines

---

## Cross-Reference Issues

### Links Not in README
- docs/prd-format.md (referenced but not prominent)
- docs/configuration.md (exists but buried)
- docs/workflows.md (not mentioned)
- contexts/README.md (not linked)
- lib/README.md (not linked)

### Inconsistent Terminology
- "ralph" vs "Ralph" vs "RALPH"
- "PRD" vs "prd-json"
- "story" vs "task"
- "iteration" vs "loop"

### Outdated References
- README mentions "config-driven approach" but not all configs documented
- References to "flags" but ralph.zsh mostly uses config.json
- "fresh context" concept explained but not detailed enough

---

## Documentation Quality Issues

### Missing Examples
- No example config.json shown in README
- No example registry.json shown
- No example .worktree-sync.json shown
- No example story JSON shown

### Missing Code Blocks
- Commands shown without code formatting
- No syntax highlighting
- Copy/paste friendly formatting missing

### Missing Diagrams
- No workflow diagrams
- No architecture diagram
- No data flow diagram
- No context loading flow

### Incomplete Tables
- Skills table exists but not all skills listed
- Commands table in ralph-help but not in README
- Story types and model routing not clearly tabulated

---

## Accessibility Issues

### For Different User Types

**New Users:**
- Missing quick-start checklist
- Missing "first time setup" guide
- Missing simple examples

**Advanced Users:**
- Missing API documentation
- Missing extension/customization guide
- Missing internal architecture docs

**Non-English Users:**
- No translations provided
- No i18n framework
- Some commands use slang

---

## Summary of Gaps by Effort to Fix

### Easy (< 2 hours)
- Environment variables reference (copy from code)
- Comprehensive flag table (copy from help output)
- Cost estimation section (copy from schema)
- Add config.json examples (create simple examples)

### Medium (2-4 hours)
- Parallel verification guide
- Monorepo support guide
- Troubleshooting section
- Architecture overview with diagram

### Hard (4+ hours)
- Complete workflow guides
- Video tutorials
- Interactive examples
- Performance tuning guide with benchmarks

---

## Recommended Priority

1. **Critical:** Environment variables, flag reference
2. **High:** Config file examples, smart routing explanation
3. **Medium:** Notification setup, cost tracking, parallel verification
4. **Low:** Obsidian setup, advanced tuning, architecture deep-dive
