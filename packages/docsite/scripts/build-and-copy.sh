#!/bin/bash
# Build the Docusaurus docsite and copy output to dashboard's public/ folder.
# Run from repo root: bash packages/docsite/scripts/build-and-copy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCSITE_DIR="$(dirname "$SCRIPT_DIR")"
DASHBOARD_PUBLIC="$DOCSITE_DIR/../dashboard/public/golems"

echo "Building docsite..."
cd /tmp
rm -rf docsite-build
cp -r "$DOCSITE_DIR" docsite-build
cd docsite-build
npm install --silent
npx docusaurus build

echo "Copying build to dashboard/public/golems/..."
rm -rf "$DASHBOARD_PUBLIC"
cp -r build "$DASHBOARD_PUBLIC"

echo "Done! $(find "$DASHBOARD_PUBLIC" -type f | wc -l | tr -d ' ') files copied ($(du -sh "$DASHBOARD_PUBLIC" | cut -f1))"
