#!/bin/bash
# Prepares a Claude Code cloud session: installs dependencies so
# `npm run check` works straight away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR/site"
npm install --no-audit --no-fund

