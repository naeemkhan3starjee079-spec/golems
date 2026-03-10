#!/bin/bash
# Project tool detection script
# Outputs markdown table of detected tools and their skills

echo "| Detected | Tool | Skill | Why Available |"
echo "|----------|------|-------|---------------|"

# Convex
if [ -f "convex.json" ] || [ -d "convex" ]; then
    echo "| ✅ | Convex | \`/golem-powers:convex\` | Found convex.json or convex/ |"
fi

# Linear
if [ -f ".linear" ] || grep -q '"linear"' package.json 2>/dev/null; then
    echo "| ✅ | Linear | \`/golem-powers:linear\` | Found .linear or linear in deps |"
fi

# Check for LINEAR_API_KEY in environment or 1Password
if [ -n "$LINEAR_API_KEY" ] || op read "op://Private/linear/api-key" &>/dev/null 2>&1; then
    if ! [ -f ".linear" ] && ! grep -q '"linear"' package.json 2>/dev/null; then
        echo "| ✅ | Linear | \`/golem-powers:linear\` | LINEAR_API_KEY available |"
    fi
fi

# Supabase
if [ -f "supabase/config.toml" ] || grep -q '"@supabase' package.json 2>/dev/null; then
    echo "| ✅ | Supabase | \`/golem-powers:supabase\` | Found supabase config or deps |"
fi

# UI Detection (React, Next.js, etc.)
UI_DETECTED=""
if [ -d "src/components" ]; then
    UI_DETECTED="src/components/"
elif [ -d "components" ]; then
    UI_DETECTED="components/"
elif [ -d "app" ]; then
    UI_DETECTED="app/"
elif ls -d */src/components 2>/dev/null | head -1 | grep -q .; then
    UI_DETECTED=$(ls -d */src/components 2>/dev/null | head -1)
elif ls -d *-ui/src 2>/dev/null | head -1 | grep -q .; then
    UI_DETECTED=$(ls -d *-ui/src 2>/dev/null | head -1)
elif ls -d apps/*/src 2>/dev/null | head -1 | grep -q .; then
    UI_DETECTED=$(ls -d apps/*/src 2>/dev/null | head -1)
elif ls -d packages/*/src 2>/dev/null | head -1 | grep -q .; then
    UI_DETECTED=$(ls -d packages/*/src 2>/dev/null | head -1)
fi
if [ -n "$UI_DETECTED" ]; then
    echo "| ✅ | UI/Frontend | \`/golem-powers:brave\` | Found $UI_DETECTED |"
fi

# Playwright
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
    echo "| ✅ | Playwright | E2E testing skills | Found playwright config |"
fi

# 1Password (check if op CLI available)
if command -v op &>/dev/null && op account list &>/dev/null 2>&1; then
    echo "| ✅ | 1Password | \`/golem-powers:1password\` | op CLI authenticated |"
fi

# PRD/Ralph (check if prd-json exists)
if [ -d "prd-json" ] || [ -f "PRD.md" ]; then
    echo "| ✅ | Ralph PRD | \`/golem-powers:prd-manager\` | Found prd-json/ or PRD.md |"
fi

# Worktrees (check if in a worktree)
if git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
    if [ -n "$(git worktree list 2>/dev/null | tail -n +2)" ]; then
        echo "| ✅ | Git Worktrees | \`/golem-powers:worktrees\` | Active worktrees detected |"
    fi
fi

# Note: If no tools detected, table will be empty (header only)

echo ""
echo "**Project root:** $(pwd)"
echo "**Git branch:** $(git branch --show-current 2>/dev/null || echo 'not a git repo')"

# MCP Server Detection
echo ""
echo "## MCP Servers (with Skill Alternatives)"
echo ""

MCP_PLUGINS_DIR="${HOME}/.claude/plugins/marketplaces/claude-plugins-official/external_plugins"
MCP_FOUND=false

echo "| MCP Server | Installed | Skill Alternative |"
echo "|------------|-----------|-------------------|"

# Linear MCP
if [ -f "$MCP_PLUGINS_DIR/linear/.mcp.json" ]; then
    MCP_FOUND=true
    echo "| Linear | ✅ plugin | \`/golem-powers:linear\` - uses API directly, faster |"
fi

# Context7 MCP
if [ -f "$MCP_PLUGINS_DIR/context7/.mcp.json" ]; then
    MCP_FOUND=true
    echo "| Context7 | ✅ plugin | \`/golem-powers:context7\` - uses API directly, faster |"
fi

# GitHub MCP
if [ -f "$MCP_PLUGINS_DIR/github/.mcp.json" ]; then
    MCP_FOUND=true
    echo "| GitHub | ✅ plugin | \`/golem-powers:github\` - uses gh CLI, no MCP needed |"
fi

# Cursor MCP config (different location)
if [ -f "${HOME}/.cursor/mcp.json" ]; then
    echo "| Cursor | ✅ config | Check ~/.cursor/mcp.json for servers |"
fi

if [ "$MCP_FOUND" = false ]; then
    echo "| - | No MCP plugins found | Skills work without MCP |"
fi

echo ""
echo "**Tip:** Skills call APIs directly - often faster than MCP. Use \`/golem-powers:skill-name\` instead of MCP when available."
