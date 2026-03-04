#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="$REPO_ROOT/node_modules/.bin:$PATH"

if [ -f "$REPO_ROOT/node_modules/.bin/playwright" ]; then
  chmod +x "$REPO_ROOT/node_modules/.bin/playwright"
fi

playwright install chromium
