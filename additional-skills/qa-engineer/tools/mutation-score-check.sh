#!/usr/bin/env bash
set -euo pipefail

# Run Stryker mutation testing and check score against threshold
# Usage: ./mutation-score-check.sh --threshold=80

THRESHOLD=80
STRYKER_ARGS=""

for arg in "$@"; do
  case "$arg" in
    --threshold=*) THRESHOLD="${arg#*=}" ;;
    --help) echo "Usage: $0 --threshold=N"; exit 0 ;;
    *) STRYKER_ARGS="$STRYKER_ARGS $arg" ;;
  esac
done

command -v npx >/dev/null 2>&1 || { echo "npx not found. Install Node.js."; exit 2; }

echo "Running Stryker (incremental mode, threshold=${THRESHOLD}%)..."
npx stryker run --incremental $STRYKER_ARGS 2>&1 | tee /tmp/stryker-output.log

# Parse mutation score from Stryker output
SCORE=$(grep -oE 'Mutation score: [0-9.]+' /tmp/stryker-output.log | grep -oE '[0-9.]+' | tail -1)

if [ -z "$SCORE" ]; then
  # Try JSON report fallback
  REPORT="reports/mutation/mutation.json"
  if [ -f "$REPORT" ]; then
    SCORE=$(jq '.files | to_entries | map(.value.mutants) | flatten | 
      {killed: map(select(.status == "Killed")) | length, total: length} |
      (.killed * 100 / .total)' "$REPORT" 2>/dev/null || echo "")
  fi
fi

[ -z "$SCORE" ] && echo "Could not parse mutation score from output." && exit 2

SCORE_INT=${SCORE%.*}
echo ""
echo "=== Mutation Score: ${SCORE}% (threshold: ${THRESHOLD}%) ==="

# Show surviving mutants summary
SURVIVED=$(grep -c 'Survived' /tmp/stryker-output.log 2>/dev/null || echo "0")
echo "Surviving mutants: $SURVIVED"
grep 'Survived' /tmp/stryker-output.log 2>/dev/null | head -10 || true

if [ "$SCORE_INT" -lt "$THRESHOLD" ]; then
  echo ""
  echo "FAILED: Mutation score ${SCORE}% is below ${THRESHOLD}% threshold."
  exit 1
else
  echo ""
  echo "PASSED: Mutation score ${SCORE}% meets ${THRESHOLD}% threshold."
  exit 0
fi
