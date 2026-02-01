#!/bin/bash
# rename-to-claude-golem.sh - Updates symlinks after directory rename
#
# USAGE:
# 1. First rename the directory: mv ~/Desktop/Gits/ralphtools ~/Desktop/Gits/claude-golem
# 2. cd ~/Desktop/Gits/claude-golem
# 3. bash scripts/rename-to-claude-golem.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

OLD_PATH="$HOME/Desktop/Gits/ralphtools"
NEW_PATH="$HOME/Desktop/Gits/claude-golem"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         Claude-Golem Symlink Migration Script                  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "ralph.zsh" ]]; then
    echo -e "${RED}ERROR: Must run from claude-golem repo root (where ralph.zsh is)${NC}"
    exit 1
fi

# Check if directory was already renamed
if [[ "$PWD" == "$OLD_PATH"* ]]; then
    echo -e "${RED}ERROR: Directory hasn't been renamed yet!${NC}"
    echo -e "${YELLOW}Run first: mv ~/Desktop/Gits/ralphtools ~/Desktop/Gits/claude-golem${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running from: $PWD${NC}"
echo ""

# Step 1: Update ~/.claude/commands/ symlinks
echo -e "${YELLOW}Step 1: Updating ~/.claude/commands/ symlinks...${NC}"
COMMANDS_DIR="$HOME/.claude/commands"

for link in "$COMMANDS_DIR"/*; do
    if [[ -L "$link" ]]; then
        target=$(readlink "$link")
        if [[ "$target" == *"ralphtools"* ]]; then
            name=$(basename "$link")
            new_target="${target/ralphtools/claude-golem}"
            echo -e "  ${BLUE}$name${NC}: $target → $new_target"
            rm "$link"
            ln -s "$new_target" "$link"
        fi
    fi
done
echo -e "${GREEN}✓ ~/.claude/commands/ updated${NC}"
echo ""

# Step 2: Update ~/.config/ralphtools/ symlinks
echo -e "${YELLOW}Step 2: Updating ~/.config/ralphtools/ symlinks...${NC}"
CONFIG_DIR="$HOME/.config/ralphtools"

if [[ -d "$CONFIG_DIR" ]]; then
    for link in "$CONFIG_DIR"/*; do
        if [[ -L "$link" ]]; then
            target=$(readlink "$link")
            if [[ "$target" == *"ralphtools"* ]]; then
                name=$(basename "$link")
                new_target="${target/ralphtools/claude-golem}"
                echo -e "  ${BLUE}$name${NC}: $target → $new_target"
                rm "$link"
                ln -s "$new_target" "$link"
            fi
        fi
    done
    echo -e "${GREEN}✓ ~/.config/ralphtools/ updated${NC}"
else
    echo -e "${YELLOW}  (directory not found, skipping)${NC}"
fi
echo ""

# Step 3: Update ~/.claude/CLAUDE.md
echo -e "${YELLOW}Step 3: Updating ~/.claude/CLAUDE.md...${NC}"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
if [[ -f "$CLAUDE_MD" ]]; then
    if grep -q "ralphtools" "$CLAUDE_MD"; then
        sed -i '' 's/ralphtools/claude-golem/g' "$CLAUDE_MD"
        echo -e "${GREEN}✓ Updated ralphtools → claude-golem in ~/.claude/CLAUDE.md${NC}"
    else
        echo -e "${GREEN}✓ No ralphtools references found${NC}"
    fi
else
    echo -e "${YELLOW}  (file not found, skipping)${NC}"
fi
echo ""

# Step 4: Remind about ~/.zshrc
echo -e "${YELLOW}Step 4: ~/.zshrc manual updates needed...${NC}"
echo -e "  ${BLUE}The following lines in ~/.zshrc reference 'ralphtools':${NC}"
grep -n "ralphtools" "$HOME/.zshrc" 2>/dev/null | head -20 || echo "  (none found)"
echo ""
echo -e "  ${YELLOW}Please manually update these lines to use 'claude-golem'${NC}"
echo ""

# Step 5: Verify
echo -e "${YELLOW}Step 5: Verification...${NC}"
echo -e "  Checking symlink targets:"

broken=0
for link in "$COMMANDS_DIR"/*; do
    if [[ -L "$link" ]]; then
        target=$(readlink "$link")
        if [[ "$target" == *"claude-golem"* ]]; then
            if [[ -e "$target" ]] || [[ -d "$target" ]]; then
                echo -e "    ${GREEN}✓${NC} $(basename "$link")"
            else
                echo -e "    ${RED}✗${NC} $(basename "$link") - BROKEN: $target"
                broken=$((broken + 1))
            fi
        fi
    fi
done

for link in "$CONFIG_DIR"/*; do
    if [[ -L "$link" ]]; then
        target=$(readlink "$link")
        if [[ "$target" == *"claude-golem"* ]]; then
            if [[ -e "$target" ]] || [[ -d "$target" ]]; then
                echo -e "    ${GREEN}✓${NC} $(basename "$link")"
            else
                echo -e "    ${RED}✗${NC} $(basename "$link") - BROKEN: $target"
                broken=$((broken + 1))
            fi
        fi
    fi
done

echo ""
if [[ $broken -eq 0 ]]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  SUCCESS! All symlinks updated and verified.                   ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Update ~/.zshrc manually (see Step 4 above)"
    echo -e "  2. Run: source ~/.config/ralphtools/ralph.zsh"
    echo -e "  3. Test: ralph-status"
else
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  WARNING: $broken broken symlinks found!                        ${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
