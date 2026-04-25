#!/usr/bin/env bash
# Runs all .business-logic/ executable specs.
# Used by flow TUI audit step and manually from the repo root.
#
# Today: TypeScript tests only, executed via vitest (using apps/demo's
# vitest install — no extra runtime dependency).
# Extend with per-language dispatch when rules in other languages are added.
#
# Modes:
#   default         human-readable verbose output for terminal use
#   FLOW_REPORTER=json
#                   emit vitest's JSON reporter on stdout, suppress stderr.
#                   Used by the flow TUI to display per-rule pass/fail counts.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TESTS=$(find .business-logic -type f -name "*.test.ts" -not -path "*/node_modules/*" | sort)

if [[ -z "$TESTS" ]]; then
  if [[ "${FLOW_REPORTER:-}" == "json" ]]; then
    echo '{"testResults":[]}'
    exit 0
  fi
  echo "no .test.ts files found under .business-logic/"
  exit 0
fi

# JSON mode: emit only the vitest JSON document to stdout. Anything pnpm or
# vitest writes to stderr (progress lines, recursive-exec wrappers) is
# discarded so the consumer can json.Unmarshal stdout directly.
if [[ "${FLOW_REPORTER:-}" == "json" ]]; then
  exec pnpm --filter demo exec vitest run \
    --reporter=json \
    --dir "$REPO_ROOT/.business-logic" 2>/dev/null
fi

# Run all TS specs through demo's vitest. They're self-contained (no
# external imports of app code), so any repo with vitest can execute them.
pnpm --filter demo exec vitest run --reporter=verbose --dir "$REPO_ROOT/.business-logic"
