#!/usr/bin/env bash
set -euo pipefail

# Detect flaky tests by running suite multiple times
# Usage: ./flaky-test-detector.sh --runner=vitest --runs=10

RUNNER="vitest"
RUNS=10
RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

for arg in "$@"; do
  case "$arg" in
    --runner=*) RUNNER="${arg#*=}" ;;
    --runs=*) RUNS="${arg#*=}" ;;
    --help) echo "Usage: $0 --runner=vitest|jest|pytest|playwright --runs=N"; exit 0 ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

case "$RUNNER" in
  vitest)   CMD="npx vitest run --reporter=json" ;;
  jest)     CMD="npx jest --json" ;;
  pytest)   CMD="python -m pytest --tb=line -q" ;;
  playwright) CMD="npx playwright test --reporter=list" ;;
  *) echo "Unsupported runner: $RUNNER"; exit 2 ;;
esac

echo "Running $RUNNER $RUNS times to detect flaky tests..."

for i in $(seq 1 "$RUNS"); do
  echo -n "  Run $i/$RUNS... "
  if $CMD > "$RESULTS_DIR/run-$i.log" 2>&1; then
    echo "PASS"
    grep -E '(PASS|FAIL|passed|failed)' "$RESULTS_DIR/run-$i.log" | tail -5 > "$RESULTS_DIR/summary-$i.log" || true
  else
    echo "FAIL"
    grep -E '(PASS|FAIL|passed|failed|FAILED|ERROR)' "$RESULTS_DIR/run-$i.log" | tail -20 > "$RESULTS_DIR/summary-$i.log" || true
  fi
done

# Extract test names that failed in some runs but passed in others
echo ""
echo "=== Flaky Test Report ==="

FAILED_TESTS=$(mktemp)
for i in $(seq 1 "$RUNS"); do
  grep -iE '(FAIL|failed|ERROR)' "$RESULTS_DIR/run-$i.log" \
    | grep -oE '[A-Za-z0-9_./: -]+\.(test|spec|_test)[A-Za-z0-9_. :-]*' \
    | sort -u >> "$FAILED_TESTS" || true
done

if [ ! -s "$FAILED_TESTS" ]; then
  echo "No flaky tests detected in $RUNS runs."
  rm -f "$FAILED_TESTS"
  exit 0
fi

FLAKY_FOUND=0
sort "$FAILED_TESTS" | uniq -c | sort -rn | while read -r count test; do
  if [ "$count" -lt "$RUNS" ]; then
    PASS_RATE=$(( (RUNS - count) * 100 / RUNS ))
    echo "  FLAKY: $test (pass rate: ${PASS_RATE}%, failed $count/$RUNS runs)"
    FLAKY_FOUND=1
  fi
done

rm -f "$FAILED_TESTS"

# Check if any flaky tests were found by re-running the detection
FLAKY_COUNT=$(sort "$RESULTS_DIR"/../"$FAILED_TESTS" 2>/dev/null | uniq -c | awk -v r="$RUNS" '$1 < r {print}' | wc -l || echo 0)
if [ "${FLAKY_FOUND:-0}" -eq 1 ] || [ "$FLAKY_COUNT" -gt 0 ]; then
  echo ""
  echo "Flaky tests detected. Fix before merging."
  exit 1
fi
exit 0
