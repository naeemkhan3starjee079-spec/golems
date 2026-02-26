#!/usr/bin/env zsh
# Run each test file in its own bun process to prevent env pollution.
# Usage: ./scripts/test-isolated.sh [--bail] [filter]

set -euo pipefail

BAIL=false
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --bail) BAIL=true ;;
    *) FILTER="$arg" ;;
  esac
done

cd "$(dirname "$0")/.."

passed=0
failed=0
failed_files=()

for file in $(find src -name "*.test.ts" | sort); do
  if [[ -n "$FILTER" && "$file" != *"$FILTER"* ]]; then
    continue
  fi

  output=$(bun test "./$file" 2>&1)
  if echo "$output" | grep -q "0 fail"; then
    ((passed++))
  else
    ((failed++))
    failed_files+=("$file")
    echo "FAIL: $file"
    echo "$output" | grep '(fail)' | head -3
    if $BAIL; then
      exit 1
    fi
  fi
done

echo ""
echo "=== Results ==="
echo "Files passed: $passed"
echo "Files failed: $failed"
if [[ ${#failed_files[@]} -gt 0 ]]; then
  echo ""
  echo "Failed files:"
  for f in "${failed_files[@]}"; do
    echo "  - $f"
  done
  exit 1
fi
