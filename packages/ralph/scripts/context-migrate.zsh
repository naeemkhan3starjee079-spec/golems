#!/bin/zsh
# context-migrate.zsh - Analyze CLAUDE.md and suggest contexts
#
# Usage:
#   ./scripts/context-migrate.zsh                     # Analyze current project
#   ./scripts/context-migrate.zsh /path/to/project    # Analyze specific project
#   ./scripts/context-migrate.zsh --diff              # Show what would be removed
#   ./scripts/context-migrate.zsh --apply             # Apply migration

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

CONTEXTS_DIR="$HOME/.claude/contexts"

# Default values
PROJECT_PATH="${1:-.}"
SHOW_DIFF=false
APPLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --diff)
            SHOW_DIFF=true
            shift
            ;;
        --apply)
            APPLY=true
            shift
            ;;
        *)
            if [[ -d "$1" ]]; then
                PROJECT_PATH="$1"
            fi
            shift
            ;;
    esac
done

# Find CLAUDE.md
CLAUDE_MD=""
if [[ -f "$PROJECT_PATH/CLAUDE.md" ]]; then
    CLAUDE_MD="$PROJECT_PATH/CLAUDE.md"
elif [[ -f "$PROJECT_PATH" && "$PROJECT_PATH" == *CLAUDE.md ]]; then
    CLAUDE_MD="$PROJECT_PATH"
else
    echo "${RED}Error: No CLAUDE.md found at $PROJECT_PATH${NC}"
    exit 1
fi

PROJECT_NAME=$(basename "$(dirname "$(realpath "$CLAUDE_MD")")")
CONTENT=$(cat "$CLAUDE_MD")
LINE_COUNT=$(wc -l < "$CLAUDE_MD" | tr -d ' ')

echo ""
echo "${BOLD}Context Migration Analysis${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project: ${CYAN}$PROJECT_NAME${NC}"
echo "File:    ${CYAN}$CLAUDE_MD${NC}"
echo "Lines:   ${CYAN}$LINE_COUNT${NC}"
echo ""

# Context detection patterns
declare -A CONTEXT_PATTERNS
CONTEXT_PATTERNS[base]="CLAUDE_COUNTER|git.*commit|scratchpad|AIDEV-NOTE|Think.*Before.*Do|documentation.*fetch"
CONTEXT_PATTERNS[tech/nextjs]="next-intl|App Router|Server Component|Client Component|getTranslations|NextIntlClientProvider"
CONTEXT_PATTERNS[tech/supabase]="supabase|migration.*sql|database.types.ts|createClient.*supabase|RLS|Row Level Security"
CONTEXT_PATTERNS[tech/convex]="convex|npx convex|\.js file error|convex/schema\.ts"
CONTEXT_PATTERNS[tech/react-native]="NativeWind|StyleSheet\.create|expo|react.*native|lucide-react-native"
CONTEXT_PATTERNS[workflow/rtl]="RTL|right-to-left|Hebrew|Arabic|flex.*reverse|dir=\"rtl\""
CONTEXT_PATTERNS[workflow/testing]="test.*id|playwright|vitest|testing.*library|data-testid"
CONTEXT_PATTERNS[workflow/design-system]="tailwind.*v4|arbitrary.*pixel|inline.*color|check.*existing.*component|@theme"
CONTEXT_PATTERNS[workflow/ralph]="ralph|PRD\.md|progress\.txt|iteration|acceptance.*criteria"

# Detect which contexts apply
echo "${BOLD}Detected Contexts:${NC}"
echo "──────────────────────────────────────────────────────────────"

DETECTED_CONTEXTS=()
MATCHED_LINES=()

for context in ${(k)CONTEXT_PATTERNS}; do
    pattern="${CONTEXT_PATTERNS[$context]}"
    matches=$(echo "$CONTENT" | grep -iEc "$pattern" 2>/dev/null || true)
    matches=${matches:-0}
    matches=$(echo "$matches" | tr -d '[:space:]')

    if [[ "$matches" -gt 0 ]]; then
        DETECTED_CONTEXTS+=("$context")
        case $context in
            base)
                estimated_lines=150
                ;;
            tech/nextjs)
                estimated_lines=300
                ;;
            tech/supabase)
                estimated_lines=150
                ;;
            tech/convex)
                estimated_lines=100
                ;;
            tech/react-native)
                estimated_lines=150
                ;;
            workflow/*)
                estimated_lines=100
                ;;
            *)
                estimated_lines=50
                ;;
        esac
        MATCHED_LINES+=($estimated_lines)
        echo "  ${GREEN}✓${NC} ${CYAN}$context${NC} (${matches} pattern matches, ~${estimated_lines} lines)"
    else
        echo "  ${YELLOW}○${NC} $context (not detected)"
    fi
done

echo ""

# Calculate savings
total_context_lines=0
for lines in "${MATCHED_LINES[@]}"; do
    total_context_lines=$((total_context_lines + lines))
done

# Estimate project-specific content (remaining after migration)
estimated_remaining=$((LINE_COUNT - total_context_lines))
if [[ $estimated_remaining -lt 50 ]]; then
    estimated_remaining=50
fi

echo "${BOLD}Migration Estimate:${NC}"
echo "──────────────────────────────────────────────────────────────"
echo "  Current size:        ${CYAN}$LINE_COUNT${NC} lines"
echo "  Shared contexts:     ${GREEN}-$total_context_lines${NC} lines (moved to ~/.claude/contexts/)"
echo "  Project-specific:    ${CYAN}~$estimated_remaining${NC} lines (stays in CLAUDE.md)"
echo ""

reduction_pct=$((100 - (estimated_remaining * 100 / LINE_COUNT)))
echo "  ${BOLD}Estimated reduction:${NC} ${GREEN}~${reduction_pct}%${NC}"
echo ""

# Generate recommended context header
echo "${BOLD}Recommended CLAUDE.md Header:${NC}"
echo "──────────────────────────────────────────────────────────────"
echo ""
echo "${CYAN}## Contexts"
for ctx in "${DETECTED_CONTEXTS[@]}"; do
    echo "@context: $ctx"
done
echo ""
echo "## Project-Specific Rules"
echo "(Your unique project rules here)${NC}"
echo ""

# Show diff mode
if [[ "$SHOW_DIFF" == "true" ]]; then
    echo "${BOLD}Content Analysis (--diff):${NC}"
    echo "──────────────────────────────────────────────────────────────"
    echo ""
    echo "${RED}Would be REMOVED (duplicates shared contexts):${NC}"

    for context in "${DETECTED_CONTEXTS[@]}"; do
        pattern="${CONTEXT_PATTERNS[$context]}"
        echo ""
        echo "  ${YELLOW}── From $context ──${NC}"
        echo "$CONTENT" | grep -iE "$pattern" | head -5 | while read -r line; do
            echo "    ${RED}-${NC} ${line:0:70}..."
        done
    done

    echo ""
    echo "${GREEN}Would be KEPT (project-specific):${NC}"
    echo "  (Everything not matching shared context patterns)"
fi

# Apply mode
if [[ "$APPLY" == "true" ]]; then
    echo "${BOLD}Applying Migration...${NC}"
    echo "──────────────────────────────────────────────────────────────"

    # Backup original
    backup_file="${CLAUDE_MD}.backup.$(date +%Y%m%d%H%M%S)"
    cp "$CLAUDE_MD" "$backup_file"
    echo "  ${GREEN}✓${NC} Backed up to: $backup_file"

    # Generate new CLAUDE.md
    new_content="# $PROJECT_NAME

## Contexts"
    for ctx in "${DETECTED_CONTEXTS[@]}"; do
        new_content+="\n@context: $ctx"
    done

    new_content+="\n\n---\n\n## Project-Specific Rules\n"
    new_content+="\n(Migrate your unique project rules here from the backup file)"
    new_content+="\n\n---\n"
    new_content+="\n<!-- Migration completed $(date '+%Y-%m-%d %H:%M:%S') -->"
    new_content+="\n<!-- Backup: $backup_file -->"

    echo -e "$new_content" > "$CLAUDE_MD"
    echo "  ${GREEN}✓${NC} Updated: $CLAUDE_MD"
    echo ""
    echo "${YELLOW}Next steps:${NC}"
    echo "  1. Open $CLAUDE_MD"
    echo "  2. Review $backup_file for project-specific rules"
    echo "  3. Copy unique rules to the Project-Specific section"
    echo "  4. Delete the backup when satisfied"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "Run with ${CYAN}--diff${NC} to see detailed content analysis"
echo "Run with ${CYAN}--apply${NC} to perform the migration"
echo ""
