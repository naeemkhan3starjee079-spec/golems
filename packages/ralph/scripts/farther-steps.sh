#!/bin/bash
# farther-steps.sh - View and process deferred actions queue
# Usage: farther-steps.sh [list|pending|apply|done|add]

STEPS_FILE="$HOME/.claude/farther-steps.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure file exists
if [[ ! -f "$STEPS_FILE" ]]; then
  echo '{"steps": []}' > "$STEPS_FILE"
fi

case "${1:-list}" in
  list|ls)
    echo -e "${CYAN}=== All Farther Steps ===${NC}"
    jq -r '.steps[] | "\(.status | if . == "pending" then "⏳" elif . == "done" then "✓" else "⊘" end) [\(.priority)] \(.id): \(.reason | .[0:60])..."' "$STEPS_FILE" 2>/dev/null || echo "No steps"
    ;;

  pending|p)
    AUTO_HIGH=false
    if [[ "$2" == "--auto-high" ]]; then
      AUTO_HIGH=true
      echo -e "${CYAN}=== Auto-applying high confidence proposals ===${NC}"
    else
      echo -e "${YELLOW}=== Pending Steps ===${NC}"
    fi

    if [[ "$AUTO_HIGH" == "true" ]]; then
      # Auto-apply context-proposals with confidence >= 0.9 and evidence >= 5
      jq -r '.steps[] | select(.status == "pending" and .type == "context-proposal" and (.confidence // 0) >= 0.9 and (.evidence // 0) >= 5) | .id' "$STEPS_FILE" | while read -r STEP_ID; do
        if [[ -n "$STEP_ID" ]]; then
          echo -e "${GREEN}Auto-applying high confidence step: $STEP_ID${NC}"
          # Call apply function recursively
          "$0" apply "$STEP_ID"
        fi
      done
      
      # Show remaining pending after auto-apply
      echo -e "${YELLOW}=== Remaining Pending Steps ===${NC}"
    fi

    jq -r '.steps[] | select(.status == "pending") | "
\u001b[33m[\(.priority)]\u001b[0m \(.id)
  Type: \(.type)
  Source: \(.source)
  Target: \(.target)
  Story: \(.story // "none") | Criteria: \(.criteria // "none")
  Reason: \(.reason)
"' "$STEPS_FILE" 2>/dev/null

    COUNT=$(jq '[.steps[] | select(.status == "pending")] | length' "$STEPS_FILE")
    echo -e "${CYAN}Total pending: ${COUNT}${NC}"
    ;;

  apply|a)
    STEP_ID="$2"
    if [[ -z "$STEP_ID" ]]; then
      echo -e "${RED}Usage: farther-steps.sh apply <step-id>${NC}"
      exit 1
    fi

    # Get step details
    STEP=$(jq -r ".steps[] | select(.id == \"$STEP_ID\")" "$STEPS_FILE")
    if [[ -z "$STEP" ]]; then
      echo -e "${RED}Step not found: $STEP_ID${NC}"
      exit 1
    fi

    TYPE=$(echo "$STEP" | jq -r '.type')
    SOURCE=$(echo "$STEP" | jq -r '.source' | sed "s|~|$HOME|g")
    TARGET=$(echo "$STEP" | jq -r '.target' | sed "s|~|$HOME|g")

    if [[ "$TYPE" == "sync" ]]; then
      echo -e "${BLUE}Syncing: $SOURCE -> $TARGET${NC}"

      # Create target directory if needed
      TARGET_DIR=$(dirname "$TARGET")
      mkdir -p "$TARGET_DIR"

      # Copy file
      if cp "$SOURCE" "$TARGET"; then
        echo -e "${GREEN}✓ Synced successfully${NC}"

        # Mark as done
        jq "(.steps[] | select(.id == \"$STEP_ID\")).status = \"done\"" "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
        echo -e "${GREEN}✓ Marked as done${NC}"
      else
        echo -e "${RED}✗ Sync failed${NC}"
        exit 1
      fi
    elif [[ "$TYPE" == "context-proposal" ]]; then
      echo -e "${BLUE}Applying context proposal: $STEP_ID${NC}"

      # Create target directory if needed
      TARGET_DIR=$(dirname "$TARGET")
      mkdir -p "$TARGET_DIR"

      # Get position hint
      POSITION=$(echo "$STEP" | jq -r '.position // "end"')
      DIFF_CONTENT=$(echo "$STEP" | jq -r '.diff // empty')

      if [[ -n "$DIFF_CONTENT" ]]; then
        # Apply diff content directly
        echo -e "${YELLOW}Applying diff content...${NC}"
        if [[ "$POSITION" == "end" ]]; then
          echo "$DIFF_CONTENT" >> "$TARGET"
        elif [[ "$POSITION" =~ ^after: ]]; then
          SECTION=$(echo "$POSITION" | sed 's/^after://')
          # Find section and insert after it
          if grep -q "$SECTION" "$TARGET" 2>/dev/null; then
            # Create temp file with content inserted after section
            awk -v section="$SECTION" -v content="$DIFF_CONTENT" '
              $0 ~ section { print; print ""; print content; next }
              { print }
            ' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
            echo -e "${GREEN}✓ Inserted after section: $SECTION${NC}"
          else
            echo -e "${YELLOW}Section not found, appending to end${NC}"
            echo "$DIFF_CONTENT" >> "$TARGET"
          fi
        else
          echo "$DIFF_CONTENT" >> "$TARGET"
        fi
      else
        # Fallback to file copy
        echo -e "${YELLOW}No diff content, copying source file${NC}"
        if [[ ! -r "$SOURCE" ]]; then
          echo -e "${RED}✗ Source file not readable: $SOURCE${NC}"
          exit 1
        fi
        if cp "$SOURCE" "$TARGET"; then
          echo -e "${GREEN}✓ Source file copied successfully${NC}"
        else
          echo -e "${RED}✗ Failed to copy source file${NC}"
          exit 1
        fi
      fi

      echo -e "${GREEN}✓ Context proposal applied${NC}"

      # Mark as done
      jq "(.steps[] | select(.id == \"$STEP_ID\")).status = \"done\"" "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
      echo -e "${GREEN}✓ Marked as done${NC}"
    else
      echo -e "${YELLOW}Unknown type: $TYPE - marking as done${NC}"
      jq "(.steps[] | select(.id == \"$STEP_ID\")).status = \"done\"" "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
    fi
    ;;

  done|d)
    STEP_ID="$2"
    if [[ -z "$STEP_ID" ]]; then
      echo -e "${RED}Usage: farther-steps.sh done <step-id>${NC}"
      exit 1
    fi

    jq "(.steps[] | select(.id == \"$STEP_ID\")).status = \"done\"" "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
    echo -e "${GREEN}✓ Marked $STEP_ID as done${NC}"
    ;;

  skip|s)
    STEP_ID="$2"
    if [[ -z "$STEP_ID" ]]; then
      echo -e "${RED}Usage: farther-steps.sh skip <step-id>${NC}"
      exit 1
    fi

    jq "(.steps[] | select(.id == \"$STEP_ID\")).status = \"skipped\"" "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
    echo -e "${YELLOW}⊘ Marked $STEP_ID as skipped${NC}"
    ;;

  clean|c)
    echo -e "${YELLOW}Removing done/skipped steps...${NC}"
    BEFORE=$(jq '.steps | length' "$STEPS_FILE")
    jq '.steps = [.steps[] | select(.status == "pending")]' "$STEPS_FILE" > "$STEPS_FILE.tmp" && mv "$STEPS_FILE.tmp" "$STEPS_FILE"
    AFTER=$(jq '.steps | length' "$STEPS_FILE")
    echo -e "${GREEN}Removed $((BEFORE - AFTER)) steps${NC}"
    ;;

  preview|pr)
    STEP_ID="$2"
    if [[ -z "$STEP_ID" ]]; then
      echo -e "${RED}Usage: farther-steps.sh preview <step-id>${NC}"
      exit 1
    fi

    # Get step details
    STEP=$(jq -r ".steps[] | select(.id == \"$STEP_ID\")" "$STEPS_FILE")
    if [[ -z "$STEP" ]]; then
      echo -e "${RED}Step not found: $STEP_ID${NC}"
      exit 1
    fi

    TYPE=$(echo "$STEP" | jq -r '.type')
    if [[ "$TYPE" != "context-proposal" ]]; then
      echo -e "${YELLOW}Preview only available for context-proposal type (found: $TYPE)${NC}"
      exit 1
    fi

    SOURCE=$(echo "$STEP" | jq -r '.source' | sed "s|~|$HOME|g")
    TARGET=$(echo "$STEP" | jq -r '.target' | sed "s|~|$HOME|g")
    DIFF_CONTENT=$(echo "$STEP" | jq -r '.diff // empty')

    echo -e "${CYAN}=== Preview: $STEP_ID ===${NC}"
    echo -e "${BLUE}Target: $TARGET${NC}"
    echo -e "${BLUE}Confidence: $(echo "$STEP" | jq -r '.confidence // "unknown"')${NC}"
    echo -e "${BLUE}Evidence: $(echo "$STEP" | jq -r '.evidence // "unknown"')${NC}"
    echo ""

    if [[ -n "$DIFF_CONTENT" ]]; then
      echo -e "${YELLOW}=== Proposed Changes ===${NC}"
      echo "$DIFF_CONTENT"
    else
      echo -e "${YELLOW}=== File Diff ===${NC}"
      if [[ -f "$TARGET" ]]; then
        diff -u "$TARGET" "$SOURCE" 2>/dev/null || echo -e "${YELLOW}Files are identical or source doesn't exist${NC}"
      else
        echo -e "${GREEN}New file would be created${NC}"
        if [[ -f "$SOURCE" ]]; then
          echo -e "${CYAN}Content:${NC}"
          head -20 "$SOURCE"
          if [[ $(wc -l < "$SOURCE") -gt 20 ]]; then
            echo -e "${CYAN}... ($(wc -l < "$SOURCE") total lines)${NC}"
          fi
        fi
      fi
    fi
    ;;

  stats)
    echo -e "${CYAN}=== Farther Steps Stats ===${NC}"
    jq -r '"Pending: \([.steps[] | select(.status == "pending")] | length)
Done: \([.steps[] | select(.status == "done")] | length)
Skipped: \([.steps[] | select(.status == "skipped")] | length)
Total: \(.steps | length)"' "$STEPS_FILE"
    ;;

  *)
    echo "farther-steps.sh - Manage deferred actions queue"
    echo ""
    echo "Usage: farther-steps.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  list, ls       List all steps (default)"
    echo "  pending, p     Show pending steps with details"
    echo "  pending --auto-high  Auto-apply high confidence context-proposals (>=0.9 confidence, >=5 evidence)"
    echo "  preview, pr ID Show diff preview for context-proposal steps"
    echo "  apply, a ID    Apply a sync step and mark done"
    echo "  done, d ID     Mark step as done (without applying)"
    echo "  skip, s ID     Mark step as skipped"
    echo "  clean, c       Remove done/skipped steps"
    echo "  stats          Show step statistics"
    ;;
esac
