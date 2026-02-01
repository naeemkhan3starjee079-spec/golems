# Claude-Golem Configuration Issues & Misconfigurations

**Generated:** 2026-01-26 by Haiku 4.5
**Scope:** Potential problems, inconsistencies, and edge cases in configuration
**Methodology:** Code review of ralph.zsh, lib/*.zsh, and ralph-ui/src/index.tsx

---

## Table of Contents

1. [Path/Directory Issues](#pathdirectory-issues)
2. [Environment Variable Inconsistencies](#environment-variable-inconsistencies)
3. [Configuration Precedence Problems](#configuration-precedence-problems)
4. [Model Routing Issues](#model-routing-issues)
5. [Platform/Compatibility Issues](#platformcompatibility-issues)
6. [Missing Error Handling](#missing-error-handling)
7. [Documentation Mismatches](#documentation-mismatches)
8. [Potential Runtime Issues](#potential-runtime-issues)

---

## Path/Directory Issues

### Issue 1: Inconsistent Config Directory Naming

**Severity:** MEDIUM

**Problem:**
- Code uses `~/.config/ralphtools/` for configuration
- README documentation sometimes refers to `~/.config/claude-golem/`
- Symlinks may point to `~/.config/claude-golem/` in installation scripts

**Locations:**
- `ralph.zsh` line 48: `RALPH_CONFIG_DIR="${RALPH_CONFIG_DIR:-$HOME/.config/ralphtools}"`
- Installation may create different paths

**Impact:**
- Users following different installation methods may have split config
- Config migrations may not find files in expected location

**Solution:** Standardize on single directory name (recommend `~/.config/ralphtools` as it's currently coded)

---

### Issue 2: RALPH_SCRIPT_DIR Detection Fragility

**Severity:** LOW-MEDIUM

**Problem:**
- Multiple fallback methods to detect script directory (lines 31-37 of ralph.zsh)
- Could fail silently if all fallback methods fail
- No validation that RALPH_SCRIPT_DIR is actually a directory

**Code:**
```bash
if [[ -n "${BASH_SOURCE[0]}" ]]; then
  RALPH_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
elif [[ -n "${(%):-%x}" ]]; then
  RALPH_SCRIPT_DIR="$(cd "$(dirname "${(%):-%x}")" && pwd)"
else
  RALPH_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi
```

**Issue:**
- If all three fail, RALPH_SCRIPT_DIR will be empty
- Later file checks (`-f "$RALPH_UI_PATH"`) will fail with unclear error
- No error message indicates the real problem

**Solution:** Add validation:
```bash
if [[ ! -d "$RALPH_SCRIPT_DIR" ]]; then
  echo "Error: Could not determine Ralph script directory"
  return 1
fi
```

---

### Issue 3: RALPH_LOGS_DIR Not Documented

**Severity:** LOW

**Problem:**
- `ralph-logs` command reads from `$RALPH_LOGS_DIR`
- This variable is never set or documented
- Likely never initialized, defaults to empty

**File:** `lib/ralph-commands.zsh` line 195

**Impact:**
- `ralph-logs` always shows "No logs directory found"
- Crash logs may be created but never readable

**Solution:** Initialize in ralph.zsh:
```bash
RALPH_LOGS_DIR="${RALPH_LOGS_DIR:-$RALPH_CONFIG_DIR/logs}"
```

---

### Issue 4: Temporary File Paths Assume /tmp Availability

**Severity:** MEDIUM

**Problem:**
- Uses `/tmp/` for:
  - Status files: `/tmp/ralph-status-*.json`
  - Output files: `/tmp/ralph_output_$$.txt`
  - Watcher FIFO: `/tmp/ralph_watcher_$$_fifo`
  - Debug logs: `/tmp/ralph-live-debug.log`

- Some systems (Windows WSL, some CI environments) may have /tmp restrictions

**Locations:**
- ralph.zsh line 209 (ntfy_topic generation)
- ralph-watcher.zsh line 67, 91
- ralph-ui/src/index.tsx line 23

**Impact:**
- May fail silently on restricted systems
- Logs not created where expected
- FIFO creation fails on some platforms

**Solution:** Use `${TMPDIR:-/tmp}` for cross-platform compatibility

---

## Environment Variable Inconsistencies

### Issue 5: RALPH_RUNTIME Config Not Used Consistently

**Severity:** MEDIUM

**Problem:**
- Config loads `RALPH_RUNTIME` from config.json (ralph-models.zsh line 20)
- But ralph.zsh always uses bun, no fallback to bash runtime
- Documented in config but never actually used

**Code:**
```bash
RALPH_RUNTIME=$(jq -r '.runtime // "bun"' "$RALPH_CONFIG_FILE" 2>/dev/null)
```

**But then:**
```bash
bun "$RALPH_UI_PATH" --run \  # (line 225 in ralph.zsh - hardcoded)
```

**Impact:**
- Users can't actually select bash runtime despite config option
- Config setting is ignored

**Solution:** Implement runtime selection or remove from config schema

---

### Issue 6: RALPH_NTFY_TOPIC Generation Is Fragile

**Severity:** LOW-MEDIUM

**Problem:**
- Uses `basename "$(pwd)"` to get project name (line 208 in ralph.zsh)
- If project is in deeply nested directory, basename still uses dirname
- Doesn't escape special characters in project name for ntfy

**Code:**
```bash
local project_name=$(basename "$(pwd)")
local ntfy_topic="${RALPH_NTFY_TOPIC:-${RALPH_NTFY_PREFIX}-${project_name}-notify}"
```

**Examples:**
- Project named `my-app@v1` → topic `etanheys-ralph-my-app@v1-notify` (@ may break)
- Project with spaces → creates invalid topic
- Empty project name (root directory) → `etanheys-ralph--notify`

**Impact:**
- Notifications may fail silently
- No validation of topic format

**Solution:** Sanitize project name:
```bash
local project_name=$(basename "$(pwd)" | tr -cd '[:alnum:]._-')
[[ -z "$project_name" ]] && project_name="unknown"
```

---

### Issue 7: Config File jq Parsing Assumes Validity

**Severity:** MEDIUM

**Problem:**
- Multiple places parse config.json with jq without validation
- If config.json is malformed, jq silently returns empty strings
- No error reporting

**Locations:**
- ralph.zsh lines 54-61 (config loading)
- ralph-models.zsh lines 15-49 (model routing)
- lib/ralph-registry.zsh (project loading)

**Example:**
```bash
_ralph_cfg_model=$(jq -r '.defaultModel // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
```

If config.json is invalid, jq returns nothing and defaults are silently used.

**Impact:**
- Silent configuration failures
- Hard to debug (user thinks config is working)
- No error message helps identify the problem

**Solution:** Add jq validation:
```bash
if ! jq empty "$RALPH_CONFIG_FILE" 2>/dev/null; then
  echo "Error: Invalid JSON in $RALPH_CONFIG_FILE" >&2
  return 1
fi
```

---

## Configuration Precedence Problems

### Issue 8: Config Precedence Is Confusing

**Severity:** MEDIUM

**Problem:**
- Three places can set RALPH_DEFAULT_MODEL:
  1. config.json (primary)
  2. user-prefs.json (fallback/legacy)
  3. Hardcoded default "opus"

- Loading order in ralph.zsh:
  1. Lines 54-61: Load from config.json
  2. Lines 64-71: Load from user-prefs.json (overwrites?)
  3. Line 75: Set hardcoded default

**Code Issue:**
```bash
# Load from config.json
_ralph_cfg_model=$(jq -r '.defaultModel // empty' "$RALPH_CONFIG_FILE" 2>/dev/null)
[[ -n "$_ralph_cfg_model" ]] && RALPH_DEFAULT_MODEL="$_ralph_cfg_model"

# Load from user-prefs.json (overwrites previous!)
_ralph_prefs_model=$(jq -r '.defaultModel // empty' "$RALPH_USER_PREFS_FILE" 2>/dev/null)
[[ -n "$_ralph_prefs_model" ]] && RALPH_DEFAULT_MODEL="$_ralph_prefs_model"
```

**Impact:**
- User-prefs.json OVERWRITES config.json (opposite of intended priority)
- Legacy file has higher priority than primary config
- Confusing for users with both files

**Solution:** Reverse precedence or remove user-prefs.json support

---

### Issue 9: Model Routing Doesn't Check for Story-Level Override

**Severity:** LOW

**Problem:**
- Function `get_model_for_story` in ralph-models.zsh doesn't check for per-story model overrides
- Ralph spec allows `"model": "opus"` in story JSON
- But `get_model_for_story` doesn't read this

**File:** ralph-models.zsh lines 111-145

**Expected Usage (from README):**
```json
{
  "id": "US-100",
  "model": "opus",  // Per-story override
  "title": "..."
}
```

**Actual:** Function only checks story TYPE (US-, BUG-, etc.)

**Impact:**
- Per-story model configuration is ignored
- Users can't override model for specific stories

**Solution:** Function should accept story JSON and check for model field

---

## Model Routing Issues

### Issue 10: Unknown Story Types Default to Sonnet Silently

**Severity:** LOW-MEDIUM

**Problem:**
- If story ID doesn't match known patterns (US-, BUG-, etc.), defaults to sonnet
- No warning that model routing failed
- User doesn't know they're using wrong model

**Code:** ralph-models.zsh line 145:
```bash
echo "${RALPH_UNKNOWN_TASK_MODEL:-sonnet}"
```

**Impact:**
- Custom story types (CUSTOM-001, etc.) silently use sonnet
- No debug info why model was selected

**Solution:** Log or warn about unknown types

---

### Issue 11: Model Routing Config Not Validated

**Severity:** LOW

**Problem:**
- config.json models section loads without validation:
```bash
RALPH_MODEL_US=$(jq -r '.models.US // "sonnet"' "$RALPH_CONFIG_FILE" 2>/dev/null)
```

- User could set invalid model names
- No validation against available models list

**Valid models:** haiku, sonnet, opus, gemini-flash, gemini-pro, kiro

**Impact:**
- Invalid models silently accepted
- Won't error until ralph tries to use them
- Hard to debug config errors

**Solution:** Validate model names:
```bash
VALID_MODELS=("haiku" "sonnet" "opus" "gemini-flash" "gemini-pro" "kiro")
for model in "${models[@]}"; do
  [[ ! " ${VALID_MODELS[*]} " =~ " $model " ]] && echo "Invalid model: $model"
done
```

---

## Platform/Compatibility Issues

### Issue 12: PTY Mode Detection Not Accurate

**Severity:** MEDIUM

**Problem:**
- ralph-ui detects PTY support but defaults to PTY mode anyway
- Bun doesn't support PTY on any platform
- Code checks `isPTYSupported()` but always tries PTY anyway

**File:** ralph-ui/src/index.tsx lines 104-122

**Code:**
```bash
const ptySupported = isPTYSupported();  // Always false for Bun

const config: CLIConfig = {
  usePty: ptySupported,  // Set to false
  // ...
};
```

**But then on lines 175-182:**
```bash
else if (arg === '--pty') {
  if (!ptySupported) {
    console.warn(`Warning: --pty requested but PTY is not supported...`);
  }
  config.usePty = ptySupported;  // Would be set to false already
}
```

**Impact:**
- PTY mode never actually works with Bun (current runtime)
- Documentation mentions PTY but it's non-functional
- Users may think streaming is working when it's not

**Solution:** Update documentation, or fix PTY support

---

### Issue 13: fswatch/inotifywait Detection Doesn't Warn on Missing Tools

**Severity:** LOW-MEDIUM

**Problem:**
- Live update watcher requires fswatch (macOS) or inotifywait (Linux)
- If neither is available, silently disables live updates
- No clear user message about what's missing

**File:** lib/ralph-watcher.zsh lines 57-62

**Code:**
```bash
watcher_tool=$(_ralph_check_fswatch) || {
  echo -e "${RALPH_COLOR_GRAY}ℹ️  Live updates disabled (install fswatch: brew install fswatch)${RALPH_COLOR_RESET}"
  RALPH_LIVE_ENABLED=false
  return 1
}
```

**Issue:** Message only mentions fswatch, not inotifywait for Linux

**Solution:** Platform-aware message:
```bash
if [[ "$OSTYPE" == "darwin"* ]]; then
  install_cmd="brew install fswatch"
else
  install_cmd="apt-get install inotify-tools"
fi
```

---

### Issue 14: Windows/WSL Compatibility Not Addressed

**Severity:** MEDIUM

**Problem:**
- Uses zsh (not available by default on Windows)
- Uses /tmp paths (problematic on WSL)
- Uses macOS-specific tools (fswatch)
- No Windows-specific documentation

**Impact:**
- WSL users may have partial functionality
- No guidance on how to set up WSL

**Solution:** Document Windows/WSL limitations, provide setup guide

---

## Missing Error Handling

### Issue 15: ralph Function Doesn't Validate prd-json Exists Early

**Severity:** MEDIUM

**Problem:**
- Validation happens at line 188, after many operations
- Variable `prd_path` uses `$(pwd)/prd-json` which may not exist
- User sees confusing error after setup wizard

**Code:** ralph.zsh lines 187-192
```bash
if [[ ! -d "$prd_path" ]]; then
  echo "Error: No prd-json/ directory found in current directory"
  echo "Run '/prd' in Claude to create a PRD first"
  return 1
fi
```

**Should be:** Validate immediately after parsing args

---

### Issue 16: bun Command Not Checked for Installation

**Severity:** MEDIUM

**Problem:**
- Checks for bun existence at lines 195-199
- But this is after environment setup
- Error message could be clearer

**Code:**
```bash
if ! command -v bun &> /dev/null; then
  echo "Error: bun is required but not installed"
  echo "Install: curl -fsSL https://bun.sh/install | bash"
  return 1
fi
```

**Should:** Check earlier, before allocating resources

---

### Issue 17: ralph-ui Error Handling Is Minimal

**Severity:** MEDIUM

**Problem:**
- ralph-ui (TypeScript) checks config validity but doesn't always provide useful errors
- Failed to load config → silent defaults
- Invalid PRD path → confusing error

**File:** ralph-ui/src/index.tsx lines 107-128

**Impact:**
- Users don't know what went wrong
- Hard to debug configuration issues

---

## Documentation Mismatches

### Issue 18: README Says Default Is 10 Iterations, Code Says 100

**Severity:** LOW

**Problem:**
- README.md line 103: `| ralph [N] | Run N iterations (default 10) |`
- ralph.zsh line 101: `RALPH_MAX_ITERATIONS="${RALPH_MAX_ITERATIONS:-100}"`
- Code uses 100, README says 10

**Example:**
```bash
ralph          # Runs 100 iterations, not 10
```

**Solution:** Update README to say "default 100"

---

### Issue 19: README Documents Monorepo Support Without Full Implementation

**Severity:** MEDIUM

**Problem:**
- README line 104: `| ralph <app> N | Run on 'apps/<app>/prd-json/' (monorepo) |`
- This syntax doesn't actually work in the main `ralph()` function
- Function expects [N] or [options], not [app]

**Actual implementation:** In registry, via repoGolem launchers

**Impact:**
- Users try to run `ralph myapp 20` and it fails
- They're confused because README seems to promise it

**Solution:** Clarify monorepo usage (via setup, creates launchers)

---

### Issue 20: README Shows Old Alert Box Style

**Severity:** VERY LOW

**Problem:**
- README uses markdown blocks with ">" for important notes
- But CLAUDE.md uses "🚨 CRITICAL:" style
- Inconsistent documentation style

**Impact:** Minor readability issue only

---

## Potential Runtime Issues

### Issue 21: ANSI Color Codes Not Tested Cross-Platform

**Severity:** LOW-MEDIUM

**Problem:**
- ralph-ui.zsh defines color codes (lines 29-35)
- Colors are used for CLI output
- Not tested on all terminals (Windows Terminal, Cygwin, etc.)

**Code:**
```bash
RALPH_COLOR_CYAN="${RALPH_COLOR_CYAN:-\033[0;36m}"
RALPH_COLOR_GREEN="${RALPH_COLOR_GREEN:-\033[0;32m}"
```

**Impact:**
- Colors may not render properly on some terminals
- Could make output unreadable

**Solution:** Detect terminal capabilities with `tput`

---

### Issue 22: Debounce Logic In File Watcher May Accumulate Events

**Severity:** LOW

**Problem:**
- RALPH_DEBOUNCE_MS default is 500ms
- File changes within debounce window are silently dropped
- User makes quick edits, only last change is seen

**File:** lib/ralph-watcher.zsh line 20

**Impact:**
- If user rapidly edits prd-json, intermediate versions are missed
- Last-update-wins behavior may hide data

---

### Issue 23: Registry Launcher Generation Creates Functions Dynamically

**Severity:** LOW-MEDIUM

**Problem:**
- Names like `run${capitalized_name}()` are created at runtime
- If project name has invalid characters, function names will be invalid

**File:** lib/ralph-registry.zsh lines 791+

**Example:**
- Project: `my-app@v1`
- Creates function: `runmyappv1()` (@ is dropped silently)
- Or function: `run@myappv1()` (invalid syntax)

**Impact:**
- Function creation silently fails or creates malformed functions
- No error reported to user

**Solution:** Validate project names:
```bash
if [[ ! "$name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Error: Invalid project name: $name"
  continue
fi
```

---

### Issue 24: Cost Tracking Uses Floating Point Math

**Severity:** LOW

**Problem:**
- ralph-models.zsh uses arithmetic that assumes floating point
- zsh doesn't support floating point natively
- Cost calculations may overflow or truncate

**File:** ralph-models.zsh lines 170-210

**Impact:**
- Cost estimates may be wrong
- Large numbers could cause arithmetic errors

---

## Summary

### Critical Issues (Must Fix)
1. Issue 7: Config file jq parsing assumes validity
2. Issue 12: PTY mode detection not accurate
3. Issue 15: No early validation of prd-json directory
4. Issue 18: README/code mismatch on default iterations

### High Priority Issues (Should Fix)
1. Issue 1: Inconsistent config directory naming
2. Issue 5: RALPH_RUNTIME config not used
3. Issue 8: Config precedence backwards (user-prefs overwrites config)
4. Issue 19: Monorepo support documentation incomplete

### Medium Priority Issues (Nice to Fix)
1. Issue 2: RALPH_SCRIPT_DIR detection fragility
2. Issue 3: RALPH_LOGS_DIR not initialized
3. Issue 6: NTFY topic generation needs sanitization
4. Issue 13: fswatch detection message not Linux-aware
5. Issue 23: Registry launcher name validation missing

### Low Priority Issues (Document or Polish)
1. Issue 4: /tmp path assumptions
2. Issue 10: Unknown story types don't warn
3. Issue 11: Model routing config not validated
4. Issue 14: Windows/WSL not documented
5. Issue 21: Color codes not tested cross-platform
6. Issue 22: Debounce window drops events
7. Issue 24: Cost tracking floating point math

---

## Testing Recommendations

1. **Config Loading:** Test with malformed config.json
2. **Path Handling:** Test with spaces and special chars in project names
3. **Model Routing:** Test with unknown story types and invalid models
4. **Platform Compatibility:** Test on Linux, WSL, and macOS
5. **File Watching:** Test rapid file changes within debounce window
6. **Error Scenarios:** Test without bun, without fswatch, without PRD directory
