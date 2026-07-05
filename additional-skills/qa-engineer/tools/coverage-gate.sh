#!/usr/bin/env bash
set -euo pipefail

# Check test coverage against thresholds
# Usage: ./coverage-gate.sh --threshold=80 --report=coverage/lcov.info

THRESHOLD=80
REPORT=""

for arg in "$@"; do
  case "$arg" in
    --threshold=*) THRESHOLD="${arg#*=}" ;;
    --report=*) REPORT="${arg#*=}" ;;
    --help) echo "Usage: $0 --threshold=N --report=<path>"; exit 0 ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

if [ -z "$REPORT" ]; then
  # Auto-detect report
  for candidate in coverage/lcov.info coverage/coverage-final.json coverage/cobertura.xml; do
    [ -f "$candidate" ] && REPORT="$candidate" && break
  done
  [ -z "$REPORT" ] && echo "No coverage report found. Run tests with coverage first." && exit 2
fi

[ ! -f "$REPORT" ] && echo "Report not found: $REPORT" && exit 2

echo "Coverage gate: threshold=${THRESHOLD}% report=$REPORT"
echo "==========================================="

UNDER_THRESHOLD=0

case "$REPORT" in
  *.info)
    # Parse LCOV format
    current_file=""
    while IFS= read -r line; do
      case "$line" in
        SF:*) current_file="${line#SF:}" ;;
        LF:*) total="${line#LF:}" ;;
        LH:*)
          hit="${line#LH:}"
          if [ "$total" -gt 0 ]; then
            pct=$((hit * 100 / total))
            if [ "$pct" -lt "$THRESHOLD" ]; then
              echo "  UNDER: $current_file (${pct}% < ${THRESHOLD}%)"
              UNDER_THRESHOLD=$((UNDER_THRESHOLD + 1))
            fi
          fi
          ;;
      esac
    done < "$REPORT"
    ;;
  *.json)
    # Parse Istanbul JSON
    for file in $(jq -r 'keys[]' "$REPORT"); do
      total=$(jq -r --arg f "$file" '.[$f].s | length' "$REPORT")
      hit=$(jq -r --arg f "$file" '[.[$f].s[]] | map(select(. > 0)) | length' "$REPORT")
      [ "$total" -eq 0 ] && continue
      pct=$((hit * 100 / total))
      if [ "$pct" -lt "$THRESHOLD" ]; then
        echo "  UNDER: $file (${pct}% < ${THRESHOLD}%)"
        UNDER_THRESHOLD=$((UNDER_THRESHOLD + 1))
      fi
    done
    ;;
  *.xml)
    # Parse Cobertura XML (line-rate is 0-1)
    while IFS= read -r line; do
      file=$(echo "$line" | grep -oP 'filename="\K[^"]+')
      rate=$(echo "$line" | grep -oP 'line-rate="\K[^"]+')
      [ -z "$rate" ] && continue
      pct=$(awk "BEGIN {printf \"%d\", $rate * 100}")
      if [ "$pct" -lt "$THRESHOLD" ]; then
        echo "  UNDER: $file (${pct}% < ${THRESHOLD}%)"
        UNDER_THRESHOLD=$((UNDER_THRESHOLD + 1))
      fi
    done < <(grep '<class ' "$REPORT" || grep '<package ' "$REPORT")
    ;;
  *) echo "Unsupported report format: $REPORT"; exit 2 ;;
esac

echo ""
if [ "$UNDER_THRESHOLD" -gt 0 ]; then
  echo "FAILED: $UNDER_THRESHOLD file(s) below ${THRESHOLD}% coverage threshold."
  exit 1
else
  echo "PASSED: All files meet ${THRESHOLD}% coverage threshold."
  exit 0
fi
