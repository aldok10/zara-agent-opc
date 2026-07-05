#!/usr/bin/env bash
set -euo pipefail

# Automated git bisect to find the commit that introduced a regression.
# Usage: ./bisect-script.sh <good-commit> <bad-commit> <test-command>
# Example: ./bisect-script.sh v1.2.0 main "npm test -- --grep 'payment flow'"

GOOD_COMMIT="${1:?Usage: $0 <good-commit> <bad-commit> <test-command>}"
BAD_COMMIT="${2:?Usage: $0 <good-commit> <bad-commit> <test-command>}"
TEST_CMD="${3:?Usage: $0 <good-commit> <bad-commit> <test-command>}"

echo "Bisecting between $GOOD_COMMIT (good) and $BAD_COMMIT (bad)"
echo "Test command: $TEST_CMD"
echo "---"

git bisect start "$BAD_COMMIT" "$GOOD_COMMIT"

git bisect run bash -c "
  # Build step (skip if not needed)
  if [ -f Makefile ]; then
    make build 2>/dev/null || exit 125  # 125 = skip untestable commits
  fi

  # Run the test
  if $TEST_CMD; then
    exit 0   # good commit
  else
    exit 1   # bad commit
  fi
"

echo "---"
echo "First bad commit:"
git bisect visualize --oneline | head -1

git bisect reset
