#!/usr/bin/env bash
# Check for dangerous mock.module() patterns that cause global test pollution.
#
# mock.module() in Bun is process-global and permanent — it replaces modules
# for ALL test files, not just the one that called it. Use spyOn() instead.
#
# Allowlisted files use mock.module for external packages with complex mocking
# needs (class constructors, nested factories) that spyOn can't handle.

set -euo pipefail

cd "$(dirname "$0")/.."

# Files allowed to use mock.module (external packages only, documented risk)
ALLOWLIST=(
  "src/__tests__/cloud-llm.test.ts"           # @anthropic-ai/sdk class constructor
  "src/__tests__/email-golem/gmail-client.test.ts"  # googleapis nested factory
  "src/__tests__/soltome-learner.test.ts"      # complex conditional mock impls
)

found=0

while IFS= read -r match; do
  file=$(echo "$match" | cut -d: -f1)

  # Check if file is in allowlist
  allowed=false
  for a in "${ALLOWLIST[@]}"; do
    if [[ "$file" == "$a" ]]; then
      allowed=true
      break
    fi
  done

  if ! $allowed; then
    if [[ $found -eq 0 ]]; then
      echo "ERROR: mock.module() detected in non-allowlisted files!"
      echo ""
      echo "mock.module() causes global test pollution in Bun — it replaces"
      echo "modules for ALL test files, not just the caller."
      echo ""
      echo "Use spyOn() instead:"
      echo '  import * as myModule from "./my-module";'
      echo '  spyOn(myModule, "myFunction").mockImplementation(...);'
      echo ""
    fi
    echo "  $match"
    ((found++))
  fi
done < <(grep -rn 'mock\.module(' src/__tests__/ src/recruiter-golem/__tests__/ 2>/dev/null || true)

if [[ $found -gt 0 ]]; then
  echo ""
  echo "$found violation(s) found. Convert to spyOn() or add to allowlist with justification."
  exit 1
fi

echo "mock.module check passed (no pollution risks found)"
