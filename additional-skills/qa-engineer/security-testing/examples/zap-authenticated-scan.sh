#!/usr/bin/env bash
set -euo pipefail

# ZAP Authenticated Baseline Scan
# Usage: ./zap-authenticated-scan.sh <target_url> <auth_token>

TARGET_URL="${1:?Usage: $0 <target_url> <auth_token>}"
AUTH_TOKEN="${2:?Usage: $0 <target_url> <auth_token>}"
REPORT_DIR="./zap-reports"
CONTAINER_NAME="zap-scan-$$"
FAIL_THRESHOLD="High"

mkdir -p "$REPORT_DIR"

echo "[*] Starting ZAP authenticated scan against: $TARGET_URL"

# Run ZAP baseline scan with authentication header
docker run --rm \
  --name "$CONTAINER_NAME" \
  --network host \
  -v "$(pwd)/$REPORT_DIR:/zap/wrk:rw" \
  -e ZAP_AUTH_HEADER="Authorization" \
  -e ZAP_AUTH_HEADER_VALUE="Bearer $AUTH_TOKEN" \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t "$TARGET_URL" \
  -z "-config replacer.full_list(0).description=auth \
      -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(0).matchtype=REQ_HEADER \
      -config replacer.full_list(0).matchstr=Authorization \
      -config replacer.full_list(0).regex=false \
      -config replacer.full_list(0).replacement='Bearer $AUTH_TOKEN'" \
  -J report.json \
  -r report.html \
  -I \
  || true  # Don't exit on findings; we gate below

echo "[*] Scan complete. Parsing results..."

# Filter findings by severity and determine exit code
HIGHS=$(python3 -c "
import json, sys
with open('$REPORT_DIR/report.json') as f:
    data = json.load(f)
alerts = data.get('site', [{}])[0].get('alerts', []) if data.get('site') else []
high_critical = [a for a in alerts if a.get('riskcode', '0') in ('3', '4')]
for alert in high_critical:
    print(f\"[{alert.get('riskdesc', 'Unknown')}] {alert.get('name', 'Unknown')}\")
sys.exit(len(high_critical))
" 2>&1) || EXIT_CODE=$?

EXIT_CODE=${EXIT_CODE:-0}

echo "[*] Reports saved to: $REPORT_DIR/"
echo "    - report.json (machine-readable)"
echo "    - report.html (human-readable)"

if [ "$EXIT_CODE" -gt 0 ]; then
  echo "[!] FAILED: $EXIT_CODE HIGH/CRITICAL findings detected:"
  echo "$HIGHS"
  exit 1
fi

echo "[+] PASSED: No HIGH/CRITICAL findings"
exit 0
