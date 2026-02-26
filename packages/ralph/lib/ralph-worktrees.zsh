#!/usr/bin/env zsh
# ═══════════════════════════════════════════════════════════════════
# RALPH-WORKTREES.ZSH - Git worktree session isolation
# ═══════════════════════════════════════════════════════════════════
# Part of the Ralph modular architecture.
# Contains: ralph-start, ralph-cleanup, ralph-archive, worktree helpers.
#
# Ralph pollutes Claude /resume history. Running in a git worktree gives
# Ralph its own separate Claude session (sessions stored per-directory).
#
# Workflow:
#   1. ralph-start        -> creates worktree, outputs cd + ralph command
#   2. (user runs ralph in worktree)
#   3. ralph-cleanup      -> merges changes, removes worktree
# ═══════════════════════════════════════════════════════════════════

# Detect package manager based on lock files
_ralph_detect_package_manager() {
  local dir="$1"

  if [[ -f "$dir/bun.lockb" ]] || [[ -f "$dir/bun.lock" ]]; then
    echo "bun"
  elif [[ -f "$dir/pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "$dir/yarn.lock" ]]; then
    echo "yarn"
  else
    echo "npm"
  fi
}

# Process .worktree-sync.json for custom sync rules
_ralph_process_worktree_sync() {
  local repo_root="$1"
  local worktree_path="$2"
  local sync_config="$3"

  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local NC='\033[0m'

  # Process sync.files - additional files to copy
  local files_count=$(jq -r '.sync.files | length // 0' "$sync_config" 2>/dev/null)
  if [[ "$files_count" -gt 0 ]]; then
    local i=0
    while [[ $i -lt $files_count ]]; do
      local file=$(jq -r ".sync.files[$i]" "$sync_config" 2>/dev/null)
      if [[ -f "$repo_root/$file" ]]; then
        # Create parent directory if needed
        local parent_dir=$(dirname "$file")
        if [[ "$parent_dir" != "." ]]; then
          mkdir -p "$worktree_path/$parent_dir"
        fi
        cp "$repo_root/$file" "$worktree_path/$file"
        echo "${GREEN}Copied $file${NC}"
      elif [[ -d "$repo_root/$file" ]]; then
        # Create parent directory if needed for directories too
        local parent_dir=$(dirname "$file")
        if [[ "$parent_dir" != "." ]]; then
          mkdir -p "$worktree_path/$parent_dir"
        fi
        cp -r "$repo_root/$file" "$worktree_path/$file"
        echo "${GREEN}Copied $file/${NC}"
      else
        echo "${YELLOW}File not found: $file${NC}"
      fi
      i=$((i + 1))
    done
  fi

  # Process sync.symlinks - files to symlink instead of copy
  local symlinks_count=$(jq -r '.sync.symlinks | length // 0' "$sync_config" 2>/dev/null)
  if [[ "$symlinks_count" -gt 0 ]]; then
    local i=0
    while [[ $i -lt $symlinks_count ]]; do
      local file=$(jq -r ".sync.symlinks[$i]" "$sync_config" 2>/dev/null)
      if [[ -e "$repo_root/$file" ]]; then
        # Create parent directory if needed
        local parent_dir=$(dirname "$file")
        if [[ "$parent_dir" != "." ]]; then
          mkdir -p "$worktree_path/$parent_dir"
        fi
        ln -s "$repo_root/$file" "$worktree_path/$file"
        echo "${GREEN}Symlinked $file${NC}"
      else
        echo "${YELLOW}Path not found for symlink: $file${NC}"
      fi
      i=$((i + 1))
    done
  fi
}

# Run post-setup commands from .worktree-sync.json
_ralph_run_sync_commands() {
  local worktree_path="$1"
  local sync_config="$2"

  local GREEN='\033[0;32m'
  local RED='\033[0;31m'
  local CYAN='\033[0;36m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  local commands_count=$(jq -r '.sync.commands | length // 0' "$sync_config" 2>/dev/null)
  if [[ "$commands_count" -gt 0 ]]; then
    echo "${CYAN}${BOLD}Running post-setup commands...${NC}"
    echo ""

    local i=0
    while [[ $i -lt $commands_count ]]; do
      local cmd=$(jq -r ".sync.commands[$i]" "$sync_config" 2>/dev/null)
      echo "   Running: $cmd"
      (
        cd "$worktree_path" || exit 1
        eval "$cmd"
      )
      if [[ $? -eq 0 ]]; then
        echo "${GREEN}Command succeeded${NC}"
      else
        echo "${RED}Command failed${NC}"
      fi
      i=$((i + 1))
    done
    echo ""
  fi
}

# Helper to output the cd + source + ralph command
_ralph_output_worktree_command() {
  local worktree_path="$1"
  shift
  local ralph_args="$@"

  local BOLD='\033[1m'
  local NC='\033[0m'

  if [[ -n "$ralph_args" ]]; then
    echo "  ${BOLD}cd $worktree_path && source ~/.config/ralphtools/ralph.zsh && ralph $ralph_args${NC}"
  else
    echo "  ${BOLD}cd $worktree_path && source ~/.config/ralphtools/ralph.zsh && ralph${NC}"
  fi
}

# ralph-start - Create a worktree for Ralph session isolation
# Usage: ralph-start [flags] [args to pass to ralph]
# Flags:
#   --install           Run package manager install in worktree
#   --dev               Start dev server in background after setup
#   --symlink-deps      Symlink node_modules instead of installing (faster)
#   --no-env            Skip copying .env files
#   --1password         Use 1Password injection (op run --env-file=.env.template)
# Creates worktree at ~/worktrees/<repo>/ralph-session
function ralph-start() {
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local RED='\033[0;31m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  # Parse flags
  local do_install=false
  local do_dev=false
  local symlink_deps=false
  local skip_env=false
  local use_1password=false
  local ralph_args=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --install)
        do_install=true
        shift
        ;;
      --dev)
        do_dev=true
        shift
        ;;
      --symlink-deps)
        symlink_deps=true
        shift
        ;;
      --no-env)
        skip_env=true
        shift
        ;;
      --1password)
        use_1password=true
        shift
        ;;
      *)
        ralph_args+=("$1")
        shift
        ;;
    esac
  done

  # Get repo info
  local repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [[ -z "$repo_root" ]]; then
    echo "${RED}Not in a git repository${NC}"
    return 1
  fi

  local repo_name=$(basename "$repo_root")
  local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  local worktree_base="$HOME/worktrees/$repo_name"
  local worktree_path="$worktree_base/ralph-session"

  echo ""
  echo "${CYAN}${BOLD}Ralph Session Isolation${NC}"
  echo ""

  # Check if worktree already exists
  if [[ -d "$worktree_path" ]]; then
    echo "${YELLOW}Worktree already exists: $worktree_path${NC}"
    echo ""
    echo "   Options:"
    echo "   1. cd $worktree_path && source ~/.config/ralphtools/ralph.zsh && ralph ${ralph_args[*]}"
    echo "   2. ralph-cleanup (to remove it first)"
    echo ""
    read -q "REPLY?Resume existing worktree? (y/n) "
    echo ""
    if [[ "$REPLY" == "y" ]]; then
      _ralph_output_worktree_command "$worktree_path" "${ralph_args[@]}"
      return 0
    else
      return 1
    fi
  fi

  # Create worktree directory structure
  mkdir -p "$worktree_base"

  echo "Creating worktree at: $worktree_path"
  echo "   Source branch: $current_branch"
  echo ""

  # Create the worktree (uses current branch as source)
  if ! git worktree add "$worktree_path" -b "ralph-session-$(date +%Y%m%d)" 2>/dev/null; then
    # Branch might already exist, try without -b
    if ! git worktree add "$worktree_path" HEAD 2>&1; then
      echo "${RED}Failed to create worktree${NC}"
      return 1
    fi
  fi

  echo "${GREEN}Worktree created${NC}"
  echo ""

  # Phase 1: Sync files from main repo
  echo "${CYAN}${BOLD}Syncing files...${NC}"
  echo ""

  # Load .worktree-sync.json if exists
  local sync_config="$repo_root/.worktree-sync.json"
  local has_sync_config=false
  if [[ -f "$sync_config" ]]; then
    has_sync_config=true
    echo "${GREEN}Found .worktree-sync.json${NC}"
  fi

  # Always sync: prd-json, progress.txt, AGENTS.md
  if [[ -d "$repo_root/prd-json" ]]; then
    cp -r "$repo_root/prd-json" "$worktree_path/"
    echo "${GREEN}Copied prd-json/ to worktree${NC}"
  fi

  if [[ -f "$repo_root/progress.txt" ]]; then
    cp "$repo_root/progress.txt" "$worktree_path/"
    echo "${GREEN}Copied progress.txt to worktree${NC}"
  fi

  if [[ -f "$repo_root/AGENTS.md" ]]; then
    cp "$repo_root/AGENTS.md" "$worktree_path/"
    echo "${GREEN}Copied AGENTS.md to worktree${NC}"
  fi

  # Sync .env files (unless skipped or using 1Password)
  if ! $skip_env && ! $use_1password; then
    if [[ -f "$repo_root/.env" ]]; then
      cp "$repo_root/.env" "$worktree_path/"
      echo "${GREEN}Copied .env to worktree${NC}"
    fi
    if [[ -f "$repo_root/.env.local" ]]; then
      cp "$repo_root/.env.local" "$worktree_path/"
      echo "${GREEN}Copied .env.local to worktree${NC}"
    fi
  fi

  # Handle 1Password injection
  if $use_1password; then
    if [[ -f "$repo_root/.env.template" ]]; then
      cp "$repo_root/.env.template" "$worktree_path/"
      echo "${GREEN}Copied .env.template for 1Password injection${NC}"
      echo "${YELLOW}   Use: op run --env-file=.env.template -- <command>${NC}"
    else
      echo "${YELLOW}No .env.template found for 1Password injection${NC}"
    fi
  fi

  # Process .worktree-sync.json if exists
  if $has_sync_config; then
    _ralph_process_worktree_sync "$repo_root" "$worktree_path" "$sync_config"
  fi

  echo ""

  # Phase 2: Handle dependencies
  if $symlink_deps || $do_install; then
    echo "${CYAN}${BOLD}Setting up dependencies...${NC}"
    echo ""

    # Detect package manager
    local pkg_manager=$(_ralph_detect_package_manager "$worktree_path")
    echo "   Package manager: ${BOLD}$pkg_manager${NC}"

    if $symlink_deps; then
      # Symlink node_modules from main repo (faster than install)
      if [[ -d "$repo_root/node_modules" ]]; then
        ln -s "$repo_root/node_modules" "$worktree_path/node_modules"
        echo "${GREEN}Symlinked node_modules from main repo${NC}"
      else
        echo "${YELLOW}No node_modules found in main repo, running install instead${NC}"
        do_install=true
      fi
    fi

    if $do_install; then
      echo "   Running $pkg_manager install..."
      (
        cd "$worktree_path" || exit 1
        case "$pkg_manager" in
          bun)
            bun install
            ;;
          pnpm)
            pnpm install
            ;;
          yarn)
            yarn install
            ;;
          *)
            npm install
            ;;
        esac
      )
      if [[ $? -eq 0 ]]; then
        echo "${GREEN}Dependencies installed${NC}"
      else
        echo "${RED}Failed to install dependencies${NC}"
      fi
    fi

    echo ""
  fi

  # Phase 3: Start dev server (if requested)
  if $do_dev; then
    echo "${CYAN}${BOLD}Starting dev server...${NC}"
    echo ""

    local pkg_manager=$(_ralph_detect_package_manager "$worktree_path")
    (
      cd "$worktree_path" || exit 1
      case "$pkg_manager" in
        bun)
          bun run dev &
          ;;
        pnpm)
          pnpm run dev &
          ;;
        yarn)
          yarn dev &
          ;;
        *)
          npm run dev &
          ;;
      esac
    )
    echo "${GREEN}Dev server started in background${NC}"
    echo ""
  fi

  # Phase 4: Run post-setup commands from .worktree-sync.json
  if $has_sync_config; then
    _ralph_run_sync_commands "$worktree_path" "$sync_config"
  fi

  echo "${CYAN}─────────────────────────────────────────────────────────────${NC}"
  echo ""
  echo "${BOLD}Session isolated! Run this command to start Ralph:${NC}"
  echo ""

  _ralph_output_worktree_command "$worktree_path" "${ralph_args[@]}"

  echo ""
  echo "${CYAN}─────────────────────────────────────────────────────────────${NC}"
  echo ""
  echo "When done, run ${BOLD}ralph-cleanup${NC} from the worktree to merge back."
  echo ""
}

# ralph-cleanup - Merge worktree changes and remove it
# Usage: ralph-cleanup [--force]
# Must be run from within a Ralph worktree
function ralph-cleanup() {
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local RED='\033[0;31m'
  local BOLD='\033[1m'
  local NC='\033[0m'

  local force=false
  [[ "$1" == "--force" ]] && force=true

  # Check if we're in a worktree
  local worktree_path=$(pwd)
  local git_dir=$(git rev-parse --git-dir 2>/dev/null)

  if [[ ! "$git_dir" =~ "worktrees" ]]; then
    echo "${RED}Not in a git worktree${NC}"
    echo "   Run this from within a Ralph worktree (created by ralph-start)"
    return 1
  fi

  # Get main repo path and branch info
  local main_repo=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||')
  local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

  echo ""
  echo "${CYAN}${BOLD}Ralph Cleanup${NC}"
  echo ""
  echo "   Worktree: $worktree_path"
  echo "   Main repo: $main_repo"
  echo "   Branch: $current_branch"
  echo ""

  # Check for uncommitted changes
  local git_status=$(git status --porcelain 2>/dev/null)
  if [[ -n "$git_status" ]]; then
    echo "${YELLOW}Uncommitted changes detected:${NC}"
    git status --short
    echo ""

    if [[ "$force" != "true" ]]; then
      read -q "REPLY?Commit these changes before cleanup? (y/n) "
      echo ""
      if [[ "$REPLY" == "y" ]]; then
        git add -A
        git commit -m "Ralph session: $(date +%Y-%m-%d)"
      else
        read -q "REPLY?Discard changes and continue? (y/n) "
        echo ""
        if [[ "$REPLY" != "y" ]]; then
          return 1
        fi
      fi
    fi
  fi

  # Copy back prd-json and progress.txt (the important state)
  echo "Syncing state back to main repo..."

  if [[ -d "$worktree_path/prd-json" ]]; then
    cp -r "$worktree_path/prd-json" "$main_repo/"
    echo "${GREEN}Synced prd-json/${NC}"
  fi

  if [[ -f "$worktree_path/progress.txt" ]]; then
    cp "$worktree_path/progress.txt" "$main_repo/"
    echo "${GREEN}Synced progress.txt${NC}"
  fi

  # Merge branch back to original
  echo ""
  echo "Merging changes to main repo..."

  # Navigate to main repo
  cd "$main_repo" || { echo "${RED}Failed to cd to main repo${NC}"; return 1; }

  # Get the original branch (stored in worktree name or default to main/master)
  local target_branch=$(git branch --show-current 2>/dev/null)
  if [[ -z "$target_branch" ]]; then
    target_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  fi

  # Merge the worktree branch
  if [[ "$current_branch" != "$target_branch" ]]; then
    if git merge "$current_branch" --no-edit 2>/dev/null; then
      echo "${GREEN}Merged $current_branch into $target_branch${NC}"
    else
      echo "${YELLOW}Merge had conflicts or nothing to merge${NC}"
    fi
  fi

  # Remove the worktree
  echo ""
  echo "Removing worktree..."

  git worktree remove "$worktree_path" --force 2>/dev/null

  # Delete the temporary branch
  git branch -d "$current_branch" 2>/dev/null || git branch -D "$current_branch" 2>/dev/null

  # Prune stale worktree references
  git worktree prune 2>/dev/null

  echo "${GREEN}Worktree removed${NC}"
  echo ""
  echo "${GREEN}${BOLD}Cleanup complete!${NC}"
  echo ""
  echo "   Your main project is at: $main_repo"
  echo "   /resume in Claude will now show clean history"
  echo ""
}

# ralph-archive [app] [--keep|--clean] - Archive completed stories to docs.local
# Flags:
#   --keep   Archive only, skip cleanup prompt
#   --clean  Archive and auto-cleanup without prompt
function ralph-archive() {
  local app=""
  local mode="prompt"  # prompt, keep, or clean
  local prd_dir
  local archive_dir="docs.local/prd-archive"

  # Parse arguments
  for arg in "$@"; do
    case "$arg" in
      --keep)
        mode="keep"
        ;;
      --clean)
        mode="clean"
        ;;
      -*)
        echo "Unknown flag: $arg"
        echo "   Usage: ralph-archive [app] [--keep|--clean]"
        return 1
        ;;
      *)
        app="$arg"
        ;;
    esac
  done

  # Determine path
  if [[ -n "$app" ]]; then
    prd_dir="apps/$app/prd-json"
  else
    prd_dir="prd-json"
  fi

  # Check for JSON mode first, fall back to markdown
  if [[ -d "$prd_dir" ]]; then
    _ralph_archive_json "$prd_dir" "$app" "$mode"
  elif [[ -f "${prd_dir%prd-json}PRD.md" ]]; then
    _ralph_archive_md "${prd_dir%prd-json}PRD.md" "$app" "$mode"
  else
    echo "PRD not found: $prd_dir or PRD.md"
    return 1
  fi
}

# Archive JSON PRD
# Usage: _ralph_archive_json <prd_dir> <app> <mode>
# mode: "prompt" (interactive), "keep" (no cleanup), "clean" (auto cleanup)
_ralph_archive_json() {
  local prd_dir="$1"
  local app="$2"
  local mode="${3:-prompt}"
  local archive_dir="docs.local/prd-archive"
  local index_file="$prd_dir/index.json"

  mkdir -p "$archive_dir"

  # Generate archive filename
  local date_suffix=$(date +%Y%m%d-%H%M%S)
  local app_prefix=""
  [[ -n "$app" ]] && app_prefix="${app}-"
  local archive_subdir="$archive_dir/${app_prefix}${date_suffix}"

  # Copy entire prd-json to archive
  mkdir -p "$archive_subdir"
  cp -r "$prd_dir"/* "$archive_subdir/"

  # Archive progress.txt if it exists
  if [[ -f "progress.txt" ]]; then
    cp "progress.txt" "$archive_subdir/"
    echo "Archived progress.txt to: $archive_subdir/"
  fi

  echo "Archived PRD to: $archive_subdir/"

  # Handle cleanup based on mode
  local do_cleanup=false

  case "$mode" in
    keep)
      echo "Keeping working PRD intact (--keep flag)"
      return 0
      ;;
    clean)
      echo "Auto-cleanup enabled (--clean flag)"
      do_cleanup=true
      ;;
    prompt)
      # Interactive prompt using gum if available, fallback to read
      if command -v gum &>/dev/null; then
        if gum confirm "Reset PRD for fresh start?" --default=false; then
          do_cleanup=true
        fi
      else
        read -q "REPLY?Reset PRD for fresh start? (y/n) "
        echo ""
        [[ "$REPLY" == "y" ]] && do_cleanup=true
      fi
      ;;
  esac

  if [[ "$do_cleanup" == "true" ]]; then
    _ralph_archive_cleanup "$prd_dir" "$index_file"
  fi
}

# Cleanup completed stories and reset PRD
_ralph_archive_cleanup() {
  local prd_dir="$1"
  local index_file="$2"

  echo ""
  echo "Cleaning up completed stories..."

  # Find and remove completed stories
  local removed_count=0
  for story_file in "$prd_dir/stories"/*.json(N); do
    if [[ -f "$story_file" ]]; then
      if jq -e '.passes == true' "$story_file" >/dev/null 2>&1; then
        local story_id=$(basename "$story_file" .json)
        rm -f "$story_file"
        echo "   Removed: $story_id"
        ((removed_count++))
      fi
    fi
  done

  # Get remaining stories for pending and blocked
  local pending_stories=()
  local blocked_stories=()

  # Read current blocked array
  blocked_stories=($(jq -r '.blocked[]? // empty' "$index_file" 2>/dev/null))

  # Build pending array from remaining story files
  for story_file in "$prd_dir/stories"/*.json(N); do
    if [[ -f "$story_file" ]]; then
      local story_id=$(basename "$story_file" .json)
      # Check if it's in blocked array
      local is_blocked=false
      for blocked_id in "${blocked_stories[@]}"; do
        if [[ "$story_id" == "$blocked_id" ]]; then
          is_blocked=true
          break
        fi
      done
      if [[ "$is_blocked" == "false" ]]; then
        pending_stories+=("$story_id")
      fi
    fi
  done

  # Calculate totals
  local total_count=$((${#pending_stories[@]} + ${#blocked_stories[@]}))
  local pending_count=${#pending_stories[@]}
  local blocked_count=${#blocked_stories[@]}

  # Build JSON arrays
  local pending_json=$(printf '%s\n' "${pending_stories[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
  local blocked_json=$(printf '%s\n' "${blocked_stories[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')
  local story_order_json=$(printf '%s\n' "${pending_stories[@]}" "${blocked_stories[@]}" | jq -R -s 'split("\n") | map(select(length > 0))')

  # Determine next story
  local next_story="null"
  if [[ ${#pending_stories[@]} -gt 0 ]]; then
    next_story="\"${pending_stories[1]}\""  # zsh arrays are 1-indexed
  fi

  # Update index.json (stats are derived on-the-fly, US-106)
  jq --argjson pending "$pending_json" \
     --argjson blocked "$blocked_json" \
     --argjson order "$story_order_json" \
     --argjson next "$next_story" '
    .storyOrder = $order |
    .pending = $pending |
    .blocked = $blocked |
    del(.stats) |
    .nextStory = $next
  ' "$index_file" > "${index_file}.tmp" && mv "${index_file}.tmp" "$index_file"

  # Create fresh progress.txt
  local progress_file="progress.txt"
  cat > "$progress_file" << EOF
# Ralph Progress - Fresh Start
Started: $(date '+%a %b %d %H:%M:%S %Z %Y')

(Previous progress archived to docs.local/prd-archive/)

EOF

  echo ""
  echo "Cleanup complete!"
  echo "   Removed $removed_count completed stories"
  echo "   Remaining: $pending_count pending, $blocked_count blocked"
  echo "   Fresh progress.txt created"
}

# Archive Markdown PRD (legacy)
# Usage: _ralph_archive_md <prd_path> <app> <mode>
_ralph_archive_md() {
  local prd_path="$1"
  local app="$2"
  local mode="${3:-prompt}"
  local archive_dir="docs.local/prd-archive"

  mkdir -p "$archive_dir"

  local date_suffix=$(date +%Y%m%d-%H%M%S)
  local app_prefix=""
  [[ -n "$app" ]] && app_prefix="${app}-"
  local archive_file="$archive_dir/${app_prefix}completed-${date_suffix}.md"

  echo "# Archived PRD Stories" > "$archive_file"
  echo "" >> "$archive_file"
  echo "**Archived:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$archive_file"
  [[ -n "$app" ]] && echo "**App:** $app" >> "$archive_file"
  echo "" >> "$archive_file"
  echo "---" >> "$archive_file"
  echo "" >> "$archive_file"
  cat "$prd_path" >> "$archive_file"

  # Archive progress.txt if it exists
  if [[ -f "progress.txt" ]]; then
    cp "progress.txt" "${archive_file%.md}-progress.txt"
    echo "Archived progress.txt"
  fi

  echo "Archived PRD to: $archive_file"

  # Handle cleanup based on mode
  local do_cleanup=false

  case "$mode" in
    keep)
      echo "Keeping working PRD intact (--keep flag)"
      return 0
      ;;
    clean)
      echo "Auto-cleanup enabled (--clean flag)"
      do_cleanup=true
      ;;
    prompt)
      if command -v gum &>/dev/null; then
        if gum confirm "Reset PRD for fresh start?" --default=false; then
          do_cleanup=true
        fi
      else
        read -q "REPLY?Reset PRD for fresh start? (y/n) "
        echo ""
        [[ "$REPLY" == "y" ]] && do_cleanup=true
      fi
      ;;
  esac

  if [[ "$do_cleanup" == "true" ]]; then
    local working_dir=$(grep '^\*\*Working Directory:\*\*' "$prd_path" 2>/dev/null)
    echo "# PRD: Next Sprint" > "$prd_path"
    echo "" >> "$prd_path"
    [[ -n "$working_dir" ]] && echo "$working_dir" >> "$prd_path"
    echo "**Created:** $(date +%Y-%m-%d)" >> "$prd_path"
    echo "" >> "$prd_path"
    echo "---" >> "$prd_path"
    echo "" >> "$prd_path"
    echo "## User Stories" >> "$prd_path"
    echo "" >> "$prd_path"
    echo "(Add new stories here)" >> "$prd_path"

    # Create fresh progress.txt
    cat > "progress.txt" << EOF
# Ralph Progress - Fresh Start
Started: $(date '+%a %b %d %H:%M:%S %Z %Y')

(Previous progress archived to docs.local/prd-archive/)

EOF

    echo "PRD cleared for next sprint"
  fi
}
