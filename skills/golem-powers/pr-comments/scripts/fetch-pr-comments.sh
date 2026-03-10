#!/usr/bin/env bash
# Fetch PR review comments with full context (diff hunks, descriptions, severity)
# Strips HTML noise, extracts structured data for Claude to read directly
# Usage: fetch-pr-comments.sh [PR_NUMBER]

set -euo pipefail

PR_NUM="${1:-}"
OUT_FILE="claude.scratchpad.pr-comments.md"

# Get PR number from current branch if not provided
if [ -z "$PR_NUM" ]; then
  PR_NUM=$(gh pr view --json number --jq '.number' 2>/dev/null || echo "")
  if [ -z "$PR_NUM" ]; then
    echo "No PR found for current branch" > "$OUT_FILE"
    exit 0
  fi
fi

# Get repo info and head SHA
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
HEAD_SHA=$(gh pr view "$PR_NUM" --json headRefOid --jq '.headRefOid' 2>/dev/null || echo "")

# Start output
cat > "$OUT_FILE" << HEADER
# PR #${PR_NUM} Review Comments

HEADER

# --- Section 1: Inline review comments (Cursor Bugbot, CodeRabbit) ---
REVIEW_COUNT=$(gh api "repos/$REPO/pulls/$PR_NUM/comments" --jq 'length' 2>/dev/null || echo "0")

if [ "$REVIEW_COUNT" -gt 0 ]; then
  echo "## Code Review Comments ($REVIEW_COUNT)" >> "$OUT_FILE"
  echo "" >> "$OUT_FILE"

  # Extract each comment with full context, strip HTML, format cleanly
  gh api "repos/$REPO/pulls/$PR_NUM/comments" --jq '
    .[] |
    select((.body | test("Addressed in commits"; "i")) | not) |
    {
      author: .user.login,
      path: (.path // "unknown"),
      line: (.line // .original_line // "?"),
      diff_hunk: .diff_hunk,
      body: .body
    }
  ' | jq -rs '
    .[] |

    # Extract title from ### heading or **bold** text
    (.body | capture("^### (?<t>.+)$"; "m") // capture("\\*\\*(?<t>[^*]{5,80})\\*\\*") // {t: (split("\n")[0][0:80])}) as $title |

    # Extract severity
    (if (.body | test("High Severity"; "i")) then "HIGH"
     elif (.body | test("Medium Severity"; "i")) then "MEDIUM"
     elif (.body | test("Potential issue"; "i")) then "MEDIUM"
     elif (.body | test("Refactor suggestion"; "i")) then "MEDIUM"
     elif (.body | test("Nitpick"; "i")) then "LOW"
     elif (.body | test("Low Severity"; "i")) then "LOW"
     else "INFO" end) as $sev |

    # Extract description from DESCRIPTION markers
    ((.body | capture("<!-- DESCRIPTION START -->\\n(?<d>[\\s\\S]*?)\\n<!-- DESCRIPTION END -->") // {d: ""}) .d) as $raw_desc |

    # If no DESCRIPTION markers, get first non-HTML paragraph from body
    (if ($raw_desc | length) > 0 then $raw_desc
     else (.body | split("\n") | map(select(startswith("<") | not) | select(startswith("<!--") | not) | select(length > 20)) | first // "")
     end) as $desc |

    "### [\($sev)] \($title.t)\n" +
    "**@\(.author)** | `\(.path):\(.line)`\n\n" +
    (if ($desc | length) > 0 then "> \($desc | gsub("\n"; "\n> "))\n\n" else "" end) +
    "```diff\n\(.diff_hunk // "no diff")\n```\n\n---\n"
  ' >> "$OUT_FILE" 2>/dev/null || echo "Failed to parse review comments" >> "$OUT_FILE"
else
  echo "## Code Review Comments" >> "$OUT_FILE"
  echo "None." >> "$OUT_FILE"
  echo "" >> "$OUT_FILE"
fi

# --- Section 2: DeepSource check ---
echo "" >> "$OUT_FILE"
echo "## DeepSource Analysis" >> "$OUT_FILE"
echo "" >> "$OUT_FILE"

if [ -n "$HEAD_SHA" ]; then
  # Try check-runs API first
  DS_CHECK=$(gh api "repos/$REPO/commits/$HEAD_SHA/check-runs" --jq '
    [.check_runs[] | select(.app.slug == "deepsource")] | first // empty |
    "- **\(.name)**: \(.conclusion // .status)\n  \(.html_url // "no url")"
  ' 2>/dev/null || echo "")

  if [ -n "$DS_CHECK" ]; then
    echo "$DS_CHECK" >> "$OUT_FILE"
  fi

  # Also check PR-level DeepSource comment for issue count
  DS_BODY=$(gh api "repos/$REPO/issues/$PR_NUM/comments" --jq '
    [.[] | select(.user.login == "deepsource-io[bot]")] | last | .body // ""
  ' 2>/dev/null || echo "")

  if [ -n "$DS_BODY" ] && [ "$DS_BODY" != "" ]; then
    # Extract analyzer name, status, and issue count using sed (macOS compatible)
    echo "$DS_BODY" | sed -n 's/.*<strong>\([^<]*\)<\/strong>.*/  Analyzer: \1/p' | head -3 >> "$OUT_FILE"
    # Extract occurrence count
    OCCUR=$(echo "$DS_BODY" | sed -n 's/.*\([0-9]* occurence[s]* introduced\).*/  \1/p' | head -1)
    [ -n "$OCCUR" ] && echo "$OCCUR" >> "$OUT_FILE"
    # Extract status (Failure/Success)
    STATUS=$(echo "$DS_BODY" | sed -n 's/.*❌.*Failure.*/  Status: FAILURE/p' | head -1)
    [ -n "$STATUS" ] && echo "$STATUS" >> "$OUT_FILE"
    STATUS2=$(echo "$DS_BODY" | sed -n 's/.*✅.*Success.*/  Status: SUCCESS/p' | head -1)
    [ -n "$STATUS2" ] && echo "$STATUS2" >> "$OUT_FILE"
    # Extract DeepSource link
    DS_LINK=$(echo "$DS_BODY" | sed -n 's/.*href="\([^"]*deepsource[^"]*\)".*/  Link: \1/p' | head -1)
    [ -n "$DS_LINK" ] && echo "$DS_LINK" >> "$OUT_FILE"
  fi

  # If nothing found at all
  if [ -z "$DS_CHECK" ] && ([ -z "$DS_BODY" ] || [ "$DS_BODY" = "" ]); then
    echo "No DeepSource results found." >> "$OUT_FILE"
  fi
else
  echo "Could not determine HEAD SHA." >> "$OUT_FILE"
fi

# --- Section 3: Summary counts ---
echo "" >> "$OUT_FILE"
echo "## Summary" >> "$OUT_FILE"
echo "" >> "$OUT_FILE"
echo "- Inline review comments: $REVIEW_COUNT" >> "$OUT_FILE"

BOT_COUNT=$(gh api "repos/$REPO/issues/$PR_NUM/comments" --jq '
  [.[] | select(.user.login | test("bot"))] | length
' 2>/dev/null || echo "0")
echo "- Bot PR comments: $BOT_COUNT (coderabbit, deepsource, etc.)" >> "$OUT_FILE"

echo "" >> "$OUT_FILE"
echo "---" >> "$OUT_FILE"
echo "*Generated by /pr-comments*" >> "$OUT_FILE"

echo "Wrote to $OUT_FILE"
