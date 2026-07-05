#!/usr/bin/env bash
set -euo pipefail

# Run only tests affected by changed files
# Usage: ./test-impact-analysis.sh --runner=vitest --base=main

RUNNER="vitest"
BASE="main"

for arg in "$@"; do
  case "$arg" in
    --runner=*) RUNNER="${arg#*=}" ;;
    --base=*) BASE="${arg#*=}" ;;
    --help) echo "Usage: $0 --runner=vitest|jest|pytest --base=<branch>"; exit 0 ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

# Get changed files relative to base branch
CHANGED_FILES=$(git diff --name-only "$BASE"...HEAD 2>/dev/null || git diff --name-only "$BASE" 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected against $BASE. Nothing to test."
  exit 0
fi

echo "Changed files (vs $BASE):"
echo "$CHANGED_FILES" | sed 's/^/  /'
echo ""

# Map source files to test files by convention
TEST_FILES=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  dir=$(dirname "$file")
  base=$(basename "$file")
  name="${base%.*}"
  ext="${base##*.}"

  # Check common test file patterns
  candidates=(
    "$dir/${name}.test.${ext}"
    "$dir/${name}.spec.${ext}"
    "$dir/__tests__/${name}.test.${ext}"
    "$dir/__tests__/${name}.spec.${ext}"
    "tests/${dir}/${name}.test.${ext}"
    "test/${dir}/${name}.test.${ext}"
    "tests/test_${name}.py"
    "tests/${name}_test.py"
  )

  for candidate in "${candidates[@]}"; do
    [ -f "$candidate" ] && TEST_FILES="$TEST_FILES $candidate"
  done

  # If the changed file IS a test file, include it directly
  if echo "$file" | grep -qE '\.(test|spec)\.|__tests__/|tests?/.*_test\.|tests?/test_'; then
    [ -f "$file" ] && TEST_FILES="$TEST_FILES $file"
  fi
done <<< "$CHANGED_FILES"

# Deduplicate
TEST_FILES=$(echo "$TEST_FILES" | tr ' ' '\n' | sort -u | grep -v '^$' || true)

if [ -z "$TEST_FILES" ]; then
  echo "No matching test files found for changed sources."
  echo "Consider running full suite manually."
  exit 0
fi

echo "Affected test files:"
echo "$TEST_FILES" | sed 's/^/  /'
echo ""
echo "Running affected tests with $RUNNER..."
echo ""

case "$RUNNER" in
  vitest)   exec npx vitest run $TEST_FILES ;;
  jest)     exec npx jest $TEST_FILES ;;
  pytest)   exec python -m pytest $TEST_FILES ;;
  *) echo "Unsupported runner: $RUNNER"; exit 2 ;;
esac
