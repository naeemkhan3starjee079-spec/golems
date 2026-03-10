#!/bin/bash
# Context Audit Script
# Diagnoses missing contexts in a project

set -eo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Context locations
GLOBAL_CONTEXTS="${HOME}/.claude/contexts"
REPO_CONTEXTS="./contexts"
CLAUDE_MD="./CLAUDE.md"

echo ""
echo "=== CONTEXT AUDIT ==="
echo ""

# ─────────────────────────────────────────────────────────────
# 1. AVAILABLE CONTEXTS
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}AVAILABLE CONTEXTS:${NC}"

AVAILABLE=()

# Check global contexts
if [ -d "$GLOBAL_CONTEXTS" ]; then
    while IFS= read -r ctx; do
        rel_path="${ctx#$GLOBAL_CONTEXTS/}"
        rel_path="${rel_path%.md}"
        AVAILABLE+=("$rel_path")
        echo "  $rel_path"
    done < <(find "$GLOBAL_CONTEXTS" -name "*.md" -type f 2>/dev/null | grep -v README | sort)
fi

# Check repo contexts (if different from global)
if [ -d "$REPO_CONTEXTS" ] && [ "$(realpath "$REPO_CONTEXTS" 2>/dev/null)" != "$(realpath "$GLOBAL_CONTEXTS" 2>/dev/null)" ]; then
    echo "  (repo contexts/)"
    while IFS= read -r ctx; do
        rel_path="${ctx#$REPO_CONTEXTS/}"
        rel_path="${rel_path%.md}"
        if [[ ! " ${AVAILABLE[*]} " =~ " ${rel_path} " ]]; then
            AVAILABLE+=("$rel_path")
            echo "  $rel_path"
        fi
    done < <(find "$REPO_CONTEXTS" -name "*.md" -type f 2>/dev/null | grep -v README | sort)
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 2. DETECT TECH STACK
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}DETECTED TECH STACK:${NC}"

NEEDED=("base" "skill-index")  # Always needed

# Helper function to check for dependency in package.json
check_pkg_for_dep() {
    local pkg_file="$1"
    local dep_pattern="$2"
    if [ -f "$pkg_file" ] && grep -q "$dep_pattern" "$pkg_file" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Collect all package.json files (root, packages/*, apps/*)
PKG_FILES=()
[ -f "package.json" ] && PKG_FILES+=("package.json")
# Use find to handle missing directories gracefully
while IFS= read -r f; do
    [ -f "$f" ] && PKG_FILES+=("$f")
done < <(find packages apps -maxdepth 2 -name "package.json" 2>/dev/null || true)

# Next.js - check all package.json files
NEXTJS_FOUND=""
for pkg in "${PKG_FILES[@]}"; do
    if check_pkg_for_dep "$pkg" '"next"'; then
        NEXTJS_FOUND="$pkg"
        break
    fi
done

if [ -n "$NEXTJS_FOUND" ]; then
    echo -e "  ${GREEN}[x]${NC} Next.js (found in $NEXTJS_FOUND)"
    NEEDED+=("tech/nextjs")
else
    echo -e "  ${YELLOW}[ ]${NC} Next.js"
fi

# React Native / Expo - check all package.json files (POSIX-safe separate checks)
RN_FOUND=""
for pkg in "${PKG_FILES[@]}"; do
    if check_pkg_for_dep "$pkg" '"react-native"' || check_pkg_for_dep "$pkg" '"expo"'; then
        RN_FOUND="$pkg"
        break
    fi
done

if [ -n "$RN_FOUND" ]; then
    echo -e "  ${GREEN}[x]${NC} React Native/Expo (found in $RN_FOUND)"
    NEEDED+=("tech/react-native")
else
    echo -e "  ${YELLOW}[ ]${NC} React Native"
fi

# Convex
if [ -d "convex" ] || [ -f "convex.json" ]; then
    echo -e "  ${GREEN}[x]${NC} Convex (found convex/)"
    NEEDED+=("tech/convex")
else
    echo -e "  ${YELLOW}[ ]${NC} Convex"
fi

# Supabase
if [ -d "supabase" ] || [ -f "supabase/config.toml" ]; then
    echo -e "  ${GREEN}[x]${NC} Supabase (found supabase/)"
    NEEDED+=("tech/supabase")
else
    echo -e "  ${YELLOW}[ ]${NC} Supabase"
fi

# RTL (Hebrew/Arabic) - check for Hebrew characters or rtl in code
if grep -rq '[\u0590-\u05FF]' . --include="*.tsx" --include="*.ts" --include="*.js" 2>/dev/null || \
   grep -rq 'dir="rtl"\|direction.*rtl\|rtl:' . --include="*.tsx" --include="*.css" 2>/dev/null; then
    echo -e "  ${GREEN}[x]${NC} RTL (found Hebrew/Arabic or RTL patterns)"
    NEEDED+=("workflow/rtl")
else
    echo -e "  ${YELLOW}[ ]${NC} RTL"
fi

# UI Components - check standard locations and monorepo patterns
UI_FOUND=""
if [ -d "src/components" ]; then
    UI_FOUND="src/components"
elif [ -d "components" ]; then
    UI_FOUND="components"
else
    # Check monorepo patterns: packages/ui, packages/ui-web, packages/ui-native
    for ui_dir in packages/ui packages/ui-web packages/ui-native; do
        if [ -d "$ui_dir" ]; then
            UI_FOUND="$ui_dir"
            break
        fi
    done
fi

if [ -n "$UI_FOUND" ]; then
    echo -e "  ${GREEN}[x]${NC} UI Components (found $UI_FOUND)"
    NEEDED+=("workflow/design-system")
else
    echo -e "  ${YELLOW}[ ]${NC} UI Components"
fi

# Tests
if [ -d "tests" ] || [ -d "__tests__" ] || ls *.test.ts *.spec.ts 2>/dev/null | head -1 | grep -q .; then
    echo -e "  ${GREEN}[x]${NC} Tests (found test files)"
    NEEDED+=("workflow/testing")
else
    echo -e "  ${YELLOW}[ ]${NC} Tests"
fi

# PRD/Ralph
if [ -d "prd-json" ] || [ -f "PRD.md" ]; then
    echo -e "  ${GREEN}[x]${NC} Ralph PRD (found prd-json/)"
    # Ralph context handled separately
fi

# Interactive mode (always for interactive Claude)
NEEDED+=("workflow/interactive")

echo ""

# ─────────────────────────────────────────────────────────────
# 3. CHECK CURRENT CLAUDE.MD
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}CURRENT CLAUDE.MD CONTEXTS:${NC}"

HAS=()

if [ -f "$CLAUDE_MD" ]; then
    # Look for @context: lines
    while IFS= read -r line; do
        ctx=$(echo "$line" | sed 's/.*@context:[[:space:]]*//' | tr -d ' ')
        if [ -n "$ctx" ]; then
            HAS+=("$ctx")
            echo "  $ctx"
        fi
    done < <(grep -E "@context:" "$CLAUDE_MD" 2>/dev/null || true)

    if [ ${#HAS[@]} -eq 0 ]; then
        echo -e "  ${RED}(none found)${NC}"
    fi
else
    echo -e "  ${RED}(no CLAUDE.md file)${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 4. RECOMMENDED BLOCK
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}RECOMMENDED @context: BLOCK:${NC}"
echo ""
echo "  ## Contexts"

# Deduplicate NEEDED (bash 3 compatible)
UNIQUE_NEEDED=()
for ctx in "${NEEDED[@]}"; do
    duplicate=false
    for existing in "${UNIQUE_NEEDED[@]}"; do
        if [ "$existing" = "$ctx" ]; then
            duplicate=true
            break
        fi
    done
    if [ "$duplicate" = false ]; then
        UNIQUE_NEEDED+=("$ctx")
    fi
done

for ctx in "${UNIQUE_NEEDED[@]}"; do
    echo "  @context: $ctx"
done

echo ""

# ─────────────────────────────────────────────────────────────
# 5. GAP SUMMARY
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}GAP SUMMARY:${NC}"

MISSING=()
for ctx in "${UNIQUE_NEEDED[@]}"; do
    if [[ ! " ${HAS[*]} " =~ " ${ctx} " ]]; then
        MISSING+=("$ctx")
    fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  ${GREEN}All recommended contexts are present!${NC}"
else
    echo -e "  ${RED}Missing ${#MISSING[@]} contexts:${NC}"
    for ctx in "${MISSING[@]}"; do
        echo -e "    - $ctx"
    done
    echo ""
    echo -e "  ${YELLOW}Action: Add the recommended block above to CLAUDE.md${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 6. SETUP HEADER CHECK
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}SETUP HEADER CHECK:${NC}"

if [ -f "$CLAUDE_MD" ]; then
    if grep -q "AI: Read This First\|SETUP.*Read.*First\|🔧 SETUP" "$CLAUDE_MD" 2>/dev/null; then
        echo -e "  ${GREEN}[x]${NC} Setup header found"
    else
        echo -e "  ${RED}[ ]${NC} No setup header - AI won't know the meta-purpose"
        echo -e "      ${YELLOW}Add a '## SETUP (AI: Read This First)' section${NC}"
    fi
else
    echo -e "  ${RED}[ ]${NC} No CLAUDE.md - create one with setup header"
fi

echo ""
echo "=== END AUDIT ==="
