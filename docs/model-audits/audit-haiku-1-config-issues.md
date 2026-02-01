# Claude-Golem Configuration Issues & Misconfigurations

Generated: 2026-01-26

## Critical Issues

### 1. Directory Name Mismatch
**Issue:** `RALPH_CONFIG_DIR` defaults to `$HOME/.config/ralphtools` but script refers to `$HOME/.config/claude-golem`

**File:** ralph.zsh line 48
```zsh
RALPH_CONFIG_DIR="${RALPH_CONFIG_DIR:-$HOME/.config/ralphtools}"
```

**File:** CLAUDE.md references `~/.config/claude-golem`

**Impact:**
- Users may have configs in both locations
- Ralph-setup and other commands look in wrong directory
- Symlinks may not resolve correctly

**Resolution:**
Choose one directory consistently across all files:
- Either use `$HOME/.config/ralphtools` everywhere
- Or use `$HOME/.config/claude-golem` everywhere
- Update CLAUDE.md and all scripts to be consistent

---

### 2. Ralph-Home Variable Inconsistency
**Issue:** `RALPH_HOME` is undefined in ralph.zsh but used in aliases

**File:** ralph.zsh line 249
```zsh
alias fsteps='$RALPH_HOME/scripts/farther-steps.sh'
alias fs='fsteps'
```

**Problem:**
- `RALPH_HOME` is never set in the script
- Should be `RALPH_SCRIPT_DIR` instead
- This breaks the `fsteps` and `fs` aliases

**Current state:**
- `RALPH_SCRIPT_DIR` is properly set at lines 31-36
- `RALPH_SCRIPT_DIR/scripts/farther-steps.sh` is the correct path

**Resolution:**
```zsh
alias fsteps='$RALPH_SCRIPT_DIR/scripts/farther-steps.sh'
alias fs='fsteps'
```

---

### 3. Config File Load Order Issue
**Issue:** Two different config files loaded with unclear priority

**Files:**
1. Line 53: `~/.config/ralphtools/config.json`
2. Line 65: `~/.config/ralphtools/user-prefs.json`

**Problem:**
- config.json is primary but user-prefs.json is fallback
- Code shows config.json values are checked first, then prefs
- Documentation only mentions config.json
- Creates confusion about which file to edit

**Current order (lines 54-71):**
1. Load config.json
2. Load user-prefs.json if config.json values are empty
3. Apply hardcoded defaults

**Impact:**
- Users may edit wrong file
- Migrations from user-prefs.json to config.json may miss values
- No clear message about deprecation

**Resolution:**
- Deprecate user-prefs.json explicitly in CLAUDE.md
- Provide migration command: `ralph-setup --migrate-prefs`
- Update error messages to guide users to config.json

---

### 4. Missing Environment Variable Documentation
**Issue:** Many RALPH_* variables are undocumented in README/CLAUDE.md

**Undocumented internal variables:**
- RALPH_LIVE_ENABLED
- RALPH_LIVE_RETRY_SECONDS
- RALPH_LIVE_MAX_RETRIES
- RALPH_UI_MODE
- RALPH_DETECTED_STACK
- RALPH_DETECTED_MONOREPO
- RALPH_NO_MSG_COOLDOWN
- RALPH_NO_MSG_MAX_RETRIES
- RALPH_GENERAL_COOLDOWN
- RALPH_PARALLEL_VERIFICATION
- RALPH_PARALLEL_AGENTS
- RALPH_DEBOUNCE_MS
- RALPH_CRITERIA_ROW
- RALPH_STORIES_ROW
- And 20+ others

**Impact:**
- Users cannot troubleshoot issues with environment
- New developers may override internal variables accidentally
- No way to configure advanced options without reading source

---

### 5. Configuration Schema Missing from Documentation
**Issue:** JSON schema files exist but not documented

**Files:**
- schemas/config.schema.json
- schemas/registry.schema.json

**Missing from:**
- README.md
- CLAUDE.md
- lib/README.md

**Issue:**
- Users don't know these files validate their config
- No instructions on editor integration (VSCode schema validation)
- Users may create invalid config without immediate feedback

**Resolution:**
Add to README.md:
```markdown
## Configuration Validation

Ralph configs are validated against JSON schemas:

**config.json:**
```json
{
  "$schema": "https://ralphtools.dev/schemas/config.schema.json"
}
```

**registry.json:**
```json
{
  "$schema": "https://ralphtools.dev/schemas/registry.schema.json"
}
```

Set up editor validation:
- VSCode: Install JSON schema extension
- Command: `jq '. + {"\$schema": "..."}' config.json > /tmp/tmp.json && mv /tmp/tmp.json config.json`
```

---

## Medium Issues

### 6. No Validation of Critical Config Fields
**Issue:** Config fields not validated before use

**Examples:**
- `notifications.ntfyTopic` - no validation that it's a valid topic name
- `defaultModel` - accepts any string, should validate against known models
- `unknownTaskType` - same issue
- `models.{type}` - accepts any model, no validation

**Impact:**
- Invalid config silently fails at runtime
- User gets confusing error: "Unknown model: my-typo-model"
- No early feedback during ralph-setup

**Resolution:**
Add validation function:
```zsh
_ralph_validate_config() {
  local config_file="$1"
  # Validate modelStrategy is "single" or "smart"
  # Validate defaultModel is known or custom format
  # Validate models.* values
  # Validate notification settings
}
```

---

### 7. Registry File Not Auto-Initialized
**Issue:** registry.json must exist before ralph-setup works properly

**Problem:**
- If registry.json doesn't exist, some features fail
- No auto-creation with defaults
- _ralph_migrate_to_registry() only runs on explicit call
- Users may skip setup and break functionality

**Impact:**
- Features that depend on registry silently fail
- Error messages don't explain the issue
- New installations may not be complete

**Resolution:**
Add auto-initialization to ralph.zsh:
```zsh
if [[ ! -f "$RALPH_REGISTRY_FILE" ]]; then
  _ralph_init_registry
fi
```

---

### 8. Model Routing Fallback Not Documented
**Issue:** What happens with unknown story prefixes?

**Code (lib/ralph-models.zsh):**
```zsh
# If no mapping found, use unknownTaskType
```

**Missing info:**
- What is the default for unknownTaskType? (assumed: sonnet)
- Where is it configured?
- How to add custom story types?

**Impact:**
- Custom story prefixes (e.g., INFRA-*, PERF-*) are routed to unknownTaskType
- Users don't know they can configure this
- No feedback about custom types being used

---

### 9. Notification Configuration Unclear
**Issue:** Three ways to enable notifications, unclear which takes precedence

**Ways to enable:**
1. config.json: `notifications.enabled = true`
2. Environment: `RALPH_NOTIFY_ENABLED=1`
3. CLI flag: `-QN` or `--notify`

**Priority order unclear:**
- Code shows: config.json checked, then env var, then CLI
- Not documented in README

**Missing:**
- How to disable notifications on CLI if enabled in config?
- What if user sets multiple conflicting values?

**Resolution:**
Document in README:
```markdown
## Notification Settings Priority

Notifications are controlled in this order:
1. **Config file** (~/.config/ralphtools/config.json): `notifications.enabled`
2. **Environment variable**: `RALPH_NOTIFY_ENABLED=1`
3. **CLI flag**: `-QN` or `--notify`

Later settings override earlier ones. To disable notifications even if
configured, use environment variable or CLI flag.
```

---

### 10. PTY Mode Auto-Detection May Fail
**Issue:** PTY support detection might give false positives/negatives

**File:** ralph-ui/src/index.tsx lines 104-105
```typescript
const ptySupported = isPTYSupported();
```

**Problem:**
- `isPTYSupported()` checks for node-pty compatibility with Bun
- If check fails, silently falls back to non-PTY mode
- User gets no feedback about lost functionality
- No way to force PTY mode for testing

**Impact:**
- Some systems get degraded performance without notification
- Streaming output may not work on certain terminals
- Debugging PTY issues is difficult

**Suggestion:**
Add verbose logging:
```typescript
if (config.verbose && !ptySupported) {
  console.warn(`PTY not supported: ${getPTYUnsupportedReason()}`);
  console.warn('Falling back to child_process mode (slower)');
}
```

---

### 11. Cost Estimation Disabled by Default
**Issue:** Cost estimation feature exists but is disabled

**File:** schemas/config.schema.json
```json
"costEstimation": {
  "enabled": { "type": "boolean", "default": false }
}
```

**Problem:**
- Feature not mentioned in README
- Not exposed in ralph-setup wizard
- Users don't know they can estimate costs
- Can help prevent expensive mistakes

**Impact:**
- Users run expensive iterations without knowing cost
- Feature is hidden/unused

---

## Minor Issues

### 12. Color Scheme Configuration Not Complete
**Issue:** Color scheme feature documented but configuration unclear

**Supported schemes:**
- default, dark, light, minimal, none, custom

**Missing:**
- Where/how to define "custom" colors
- Example custom color configuration
- How to test color output (ralph-terminal-check)

---

### 13. Parallel Verification Not Documented in README
**Issue:** Parallel agent feature exists but not documented

**Config options:**
- `parallelVerification` (boolean)
- `parallelAgents` (1-5)

**Missing:**
- Explanation of what this does
- When to use it
- Performance implications
- Examples in README

---

### 14. No Configuration Migration Path
**Issue:** Projects move configs between locations but no migration help

**Old locations:**
- ~/.config/ralphtools/projects.json
- ~/.claude/shared-project-mcps.json
- ~/.config/ralphtools/repo-claude-v2.zsh

**New location:**
- ~/.config/ralphtools/registry.json

**Missing:**
- Explicit migration command in help
- Status check command to see if migration is needed
- Warning when old files exist

**Solution:**
Add commands:
```bash
ralph-setup --check-config   # Check for old config files
ralph-setup --migrate-all    # Migrate all configs
```

---

### 15. No Configuration Backup Before Changes
**Issue:** ralph-setup modifies config without backing up

**Risk:**
- User accidentally deletes settings
- No easy rollback
- Hard to debug config issues

**Suggestion:**
```zsh
# Before modifying config
cp "$RALPH_CONFIG_FILE" "$RALPH_CONFIG_FILE.backup.$(date +%s)"
```

---

## Documentation Gaps

### 16. Missing Examples of Common Configurations

**Need examples for:**
- Single model configuration (Sonnet only)
- Multi-model smart routing setup
- 1Password integration
- Parallel verification setup
- Custom color scheme
- Custom MCP definitions
- Monorepo setup
- Per-project overrides

---

### 17. lib/README.md Incomplete

**Missing:**
- Module dependency graph
- Load order explanation
- How to add new modules
- Module naming conventions
- Testing modules in isolation

---

### 18. No Configuration Troubleshooting Guide

**Missing help for:**
- "Model not available" errors
- "Registry not found" issues
- "1Password not authenticated" resolution
- "MCP not working" debugging
- "Notifications not sending" fixes

---

## Summary by Severity

### Critical (Block Functionality)
1. RALPH_HOME not defined (breaks fsteps alias)
2. Config directory name mismatch

### High (Cause Confusion)
3. Config file load order undocumented
4. Missing environment variable documentation
5. No registry.json auto-initialization

### Medium (Reduce Usability)
6. Config validation missing
7. Model routing fallback undocumented
8. Notification priority unclear
9. PTY failure mode silent
10. Cost estimation hidden

### Low (Nice to Have)
11. Color scheme documentation
12. Parallel verification undocumented
13. Configuration migration path unclear
14. No config backups
15. Missing common configuration examples
16. Library module documentation incomplete
17. No troubleshooting guide
