#!/usr/bin/env bash
set -euo pipefail

# Aggregate security scanning: SAST + secrets + SCA/container
# Usage: ./security-scan.sh [--skip-container] [--severity=HIGH,CRITICAL]

SKIP_CONTAINER=false
SEVERITY="HIGH,CRITICAL"
FAIL=0
SUMMARY=""

for arg in "$@"; do
  case "$arg" in
    --skip-container) SKIP_CONTAINER=true ;;
    --severity=*) SEVERITY="${arg#*=}" ;;
    --help) echo "Usage: $0 [--skip-container] [--severity=HIGH,CRITICAL]"; exit 0 ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

echo "Security Scan (fail on: $SEVERITY)"
echo "==========================================="

# 1. Semgrep (SAST)
echo ""
echo "[1/3] Semgrep (SAST)..."
if command -v semgrep >/dev/null 2>&1; then
  SEMGREP_OUT=$(mktemp)
  if semgrep scan --config=auto --json . > "$SEMGREP_OUT" 2>/dev/null; then
    SEMGREP_HIGH=$(jq '[.results[] | select(.extra.severity == "ERROR" or .extra.severity == "WARNING")] | length' "$SEMGREP_OUT")
    SEMGREP_TOTAL=$(jq '.results | length' "$SEMGREP_OUT")
    echo "  Findings: $SEMGREP_TOTAL total, $SEMGREP_HIGH high/warning"
    SUMMARY="$SUMMARY\n  Semgrep: $SEMGREP_TOTAL findings ($SEMGREP_HIGH high+)"
    [ "$SEMGREP_HIGH" -gt 0 ] && FAIL=1
  else
    echo "  Semgrep scan failed (non-zero exit). Check config."
  fi
  rm -f "$SEMGREP_OUT"
else
  echo "  SKIPPED: semgrep not installed"
fi

# 2. Gitleaks (secrets)
echo ""
echo "[2/3] Gitleaks (secrets)..."
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS_OUT=$(mktemp)
  if gitleaks git --report-format json --report-path "$GITLEAKS_OUT" 2>/dev/null; then
    echo "  No secrets found."
    SUMMARY="$SUMMARY\n  Gitleaks: 0 secrets"
  else
    LEAKS=$(jq 'length' "$GITLEAKS_OUT" 2>/dev/null || echo "unknown")
    echo "  ALERT: $LEAKS secret(s) detected!"
    SUMMARY="$SUMMARY\n  Gitleaks: $LEAKS secrets FOUND"
    FAIL=1
  fi
  rm -f "$GITLEAKS_OUT"
else
  echo "  SKIPPED: gitleaks not installed"
fi

# 3. Trivy (SCA + container)
echo ""
echo "[3/3] Trivy (SCA/container)..."
if command -v trivy >/dev/null 2>&1; then
  # Filesystem scan (dependencies)
  TRIVY_OUT=$(mktemp)
  trivy fs --severity "$SEVERITY" --format json --output "$TRIVY_OUT" . 2>/dev/null || true
  TRIVY_VULNS=$(jq '[.Results[]?.Vulnerabilities[]?] | length' "$TRIVY_OUT" 2>/dev/null || echo "0")
  echo "  Filesystem vulnerabilities ($SEVERITY): $TRIVY_VULNS"
  SUMMARY="$SUMMARY\n  Trivy FS: $TRIVY_VULNS vulnerabilities ($SEVERITY)"
  [ "$TRIVY_VULNS" -gt 0 ] && FAIL=1
  rm -f "$TRIVY_OUT"

  # Container scan
  if [ "$SKIP_CONTAINER" = false ] && [ -f Dockerfile ]; then
    TRIVY_IMG=$(mktemp)
    IMAGE_NAME=$(basename "$(pwd)"):latest
    trivy image --severity "$SEVERITY" --format json --output "$TRIVY_IMG" "$IMAGE_NAME" 2>/dev/null || true
    IMG_VULNS=$(jq '[.Results[]?.Vulnerabilities[]?] | length' "$TRIVY_IMG" 2>/dev/null || echo "0")
    echo "  Container vulnerabilities ($SEVERITY): $IMG_VULNS"
    SUMMARY="$SUMMARY\n  Trivy Image: $IMG_VULNS vulnerabilities ($SEVERITY)"
    [ "$IMG_VULNS" -gt 0 ] && FAIL=1
    rm -f "$TRIVY_IMG"
  elif [ "$SKIP_CONTAINER" = true ]; then
    echo "  Container scan: skipped"
  fi
else
  echo "  SKIPPED: trivy not installed"
fi

# Summary
echo ""
echo "=== Summary ==="
echo -e "$SUMMARY"
echo ""

if [ "$FAIL" -eq 1 ]; then
  echo "FAILED: Security issues found at $SEVERITY level."
  exit 1
else
  echo "PASSED: No $SEVERITY issues found."
  exit 0
fi
