#!/bin/bash
# Context Audit Script
# Diagnoses missing rules/contexts in a project

set -eo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Locations
RULES_DIR="./.claude/rules"
CONTEXTS_DIR="./rules-library"
CLAUDE_MD="./CLAUDE.md"

echo ""
echo "=== CONTEXT AUDIT ==="
echo ""

# ─────────────────────────────────────────────────────────────
# 1. AUTO-LOADED RULES (.claude/rules/)
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}AUTO-LOADED RULES (.claude/rules/):${NC}"

if [ -d "$RULES_DIR" ]; then
    RULE_COUNT=0
    while IFS= read -r rule; do
        name="${rule#$RULES_DIR/}"
        # Check for globs frontmatter (format: "globs: pattern")
        globs=$(head -5 "$rule" 2>/dev/null | grep "^globs:" | sed 's/^globs:[[:space:]]*//' | tr -d '"' || true)
        if [ -n "$globs" ]; then
            echo -e "  ${GREEN}[x]${NC} $name (targets: $globs)"
        else
            echo -e "  ${GREEN}[x]${NC} $name (all paths)"
        fi
        RULE_COUNT=$((RULE_COUNT + 1))
    done < <(find "$RULES_DIR" -name "*.md" -type f 2>/dev/null | sort)

    if [ $RULE_COUNT -eq 0 ]; then
        echo -e "  ${RED}(no rules found)${NC}"
    fi
else
    echo -e "  ${RED}(no .claude/rules/ directory)${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 2. EXPORTABLE CONTEXTS (rules-library/)
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}EXPORTABLE CONTEXTS (rules-library/):${NC}"

if [ -d "$CONTEXTS_DIR" ]; then
    CTX_COUNT=0
    while IFS= read -r ctx; do
        rel_path="${ctx#$CONTEXTS_DIR/}"
        echo "  $rel_path"
        CTX_COUNT=$((CTX_COUNT + 1))
    done < <(find "$CONTEXTS_DIR" -name "*.md" -type f 2>/dev/null | grep -v README | grep -v CLAUDE | sort)

    if [ $CTX_COUNT -eq 0 ]; then
        echo "  (none)"
    fi
else
    echo "  (no rules-library/ directory)"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 3. DETECT TECH STACK
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}DETECTED TECH STACK:${NC}"

NEEDED_RULES=()
NEEDED_CONTEXTS=()

# Helper function
check_pkg_for_dep() {
    local pkg_file="$1"
    local dep_pattern="$2"
    if [ -f "$pkg_file" ] && grep -q "$dep_pattern" "$pkg_file" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Collect all package.json files
PKG_FILES=()
[ -f "package.json" ] && PKG_FILES+=("package.json")
while IFS= read -r f; do
    [ -f "$f" ] && PKG_FILES+=("$f")
done < <(find packages apps -maxdepth 2 -name "package.json" 2>/dev/null || true)

# Ralph/Ink
if [ -d "packages/ralph" ] || [ -f "ralph.zsh" ]; then
    echo -e "  ${GREEN}[x]${NC} Ralph"
    NEEDED_RULES+=("ralph-workflow.md")
fi

if [ -d "ralph-ui" ] || [ -d "packages/ralph/ralph-ui" ]; then
    echo -e "  ${GREEN}[x]${NC} Ink CLI (ralph-ui)"
    NEEDED_RULES+=("tech-ink.md")
fi

# Next.js
NEXTJS_FOUND=""
for pkg in "${PKG_FILES[@]}"; do
    if check_pkg_for_dep "$pkg" '"next"'; then
        NEXTJS_FOUND="$pkg"
        break
    fi
done
if [ -n "$NEXTJS_FOUND" ]; then
    echo -e "  ${GREEN}[x]${NC} Next.js (found in $NEXTJS_FOUND)"
    NEEDED_CONTEXTS+=("tech/nextjs.md")
else
    echo -e "  ${YELLOW}[ ]${NC} Next.js"
fi

# React Native / Expo
RN_FOUND=""
for pkg in "${PKG_FILES[@]}"; do
    if check_pkg_for_dep "$pkg" '"react-native"' || check_pkg_for_dep "$pkg" '"expo"'; then
        RN_FOUND="$pkg"
        break
    fi
done
if [ -n "$RN_FOUND" ]; then
    echo -e "  ${GREEN}[x]${NC} React Native/Expo (found in $RN_FOUND)"
    NEEDED_CONTEXTS+=("tech/react-native.md")
else
    echo -e "  ${YELLOW}[ ]${NC} React Native"
fi

# Convex
if [ -d "convex" ] || [ -f "convex.json" ]; then
    echo -e "  ${GREEN}[x]${NC} Convex"
    NEEDED_CONTEXTS+=("tech/convex.md")
else
    echo -e "  ${YELLOW}[ ]${NC} Convex"
fi

# Supabase
if [ -d "supabase" ] || [ -f "supabase/config.toml" ]; then
    echo -e "  ${GREEN}[x]${NC} Supabase"
    NEEDED_CONTEXTS+=("tech/supabase.md")
else
    echo -e "  ${YELLOW}[ ]${NC} Supabase"
fi

echo ""

# ─────────────────────────────────────────────────────────────
# 4. GAP ANALYSIS
# ─────────────────────────────────────────────────────────────
echo -e "${CYAN}GAP ANALYSIS:${NC}"

# Always need golems-base
NEEDED_RULES+=("golems-base.md")

MISSING_RULES=()
for rule in "${NEEDED_RULES[@]}"; do
    if [ ! -f "$RULES_DIR/$rule" ]; then
        MISSING_RULES+=("$rule")
    fi
done

MISSING_CONTEXTS=()
for ctx in "${NEEDED_CONTEXTS[@]}"; do
    if [ ! -f "$CONTEXTS_DIR/$ctx" ]; then
        MISSING_CONTEXTS+=("$ctx")
    fi
done

if [ ${#MISSING_RULES[@]} -eq 0 ] && [ ${#MISSING_CONTEXTS[@]} -eq 0 ]; then
    echo -e "  ${GREEN}All rules and contexts present!${NC}"
else
    if [ ${#MISSING_RULES[@]} -gt 0 ]; then
        echo -e "  ${RED}Missing rules (.claude/rules/):${NC}"
        for rule in "${MISSING_RULES[@]}"; do
            echo -e "    - $rule"
        done
    fi
    if [ ${#MISSING_CONTEXTS[@]} -gt 0 ]; then
        echo -e "  ${YELLOW}Missing contexts (rules-library/):${NC}"
        for ctx in "${MISSING_CONTEXTS[@]}"; do
            echo -e "    - $ctx"
        done
    fi
fi

echo ""
echo "=== END AUDIT ==="
