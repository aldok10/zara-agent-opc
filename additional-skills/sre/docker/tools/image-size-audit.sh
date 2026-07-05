#!/usr/bin/env bash
set -euo pipefail

# Image Size Audit Tool
# Analyzes Docker image layers, identifies bloat, and reports optimization opportunities.
# Usage: ./image-size-audit.sh <image-name:tag>

IMAGE="${1:?Usage: $0 <image:tag>}"

echo "=== Image Size Audit: ${IMAGE} ==="
echo ""

if ! command -v docker &>/dev/null; then
    echo "ERROR: docker CLI not found"
    exit 1
fi

echo "--- Summary ---"
docker image inspect "${IMAGE}" --format '{{.Size}}' | awk '{printf "Total size: %.1f MB\n", $1/1024/1024}'
docker image inspect "${IMAGE}" --format '{{.Architecture}}' | xargs -I{} echo "Architecture: {}"
docker image inspect "${IMAGE}" --format '{{.Os}}' | xargs -I{} echo "OS: {}"
echo ""

echo "--- Layer Analysis ---"
docker history "${IMAGE}" --format "table {{.Size}}\t{{.CreatedBy}}" --no-trunc | head -30
echo ""

echo "--- Layer Sizes (sorted descending) ---"
docker history "${IMAGE}" --format "{{.Size}}\t{{.CreatedBy}}" --no-trunc \
    | sort -rh \
    | head -10 \
    | awk -F'\t' '{printf "%-10s %s\n", $1, substr($2, 1, 120)}'
echo ""

echo "--- Image Metadata ---"
echo "Created: $(docker image inspect "${IMAGE}" --format '{{.Created}}')"
echo "Layers: $(docker image inspect "${IMAGE}" --format '{{len .RootFS.Layers}}')"
LABELS=$(docker image inspect "${IMAGE}" --format '{{json .Config.Labels}}')
if [ "${LABELS}" != "null" ] && [ "${LABELS}" != "{}" ]; then
    echo "Labels: ${LABELS}"
fi
echo ""

echo "--- Security Checks ---"
USER=$(docker image inspect "${IMAGE}" --format '{{.Config.User}}')
if [ -z "${USER}" ] || [ "${USER}" = "root" ] || [ "${USER}" = "0" ]; then
    echo "[WARN] Runs as root -- set USER to non-root UID"
else
    echo "[OK] Runs as user: ${USER}"
fi

HEALTHCHECK=$(docker image inspect "${IMAGE}" --format '{{.Config.Healthcheck}}')
if [ -z "${HEALTHCHECK}" ] || [ "${HEALTHCHECK}" = "<nil>" ]; then
    echo "[WARN] No HEALTHCHECK defined"
else
    echo "[OK] HEALTHCHECK configured"
fi

ENTRYPOINT=$(docker image inspect "${IMAGE}" --format '{{json .Config.Entrypoint}}')
if echo "${ENTRYPOINT}" | grep -q '/bin/sh'; then
    echo "[WARN] ENTRYPOINT uses shell form -- prefer exec form"
else
    echo "[OK] ENTRYPOINT: ${ENTRYPOINT}"
fi
echo ""

echo "--- Size Targets ---"
SIZE_BYTES=$(docker image inspect "${IMAGE}" --format '{{.Size}}')
SIZE_MB=$(echo "${SIZE_BYTES}" | awk '{printf "%.0f", $1/1024/1024}')

if [ "${SIZE_MB}" -lt 10 ]; then
    echo "[OK] ${SIZE_MB}MB -- excellent (static binary range)"
elif [ "${SIZE_MB}" -lt 50 ]; then
    echo "[OK] ${SIZE_MB}MB -- good (compiled language range)"
elif [ "${SIZE_MB}" -lt 100 ]; then
    echo "[INFO] ${SIZE_MB}MB -- acceptable for Node.js/Python"
elif [ "${SIZE_MB}" -lt 200 ]; then
    echo "[INFO] ${SIZE_MB}MB -- acceptable for Java/large runtimes"
else
    echo "[WARN] ${SIZE_MB}MB -- exceeds recommended thresholds, investigate layer bloat"
fi
echo ""

if command -v dive &>/dev/null; then
    echo "--- Dive Analysis (efficiency score) ---"
    dive "${IMAGE}" --ci 2>&1 | grep -E "(efficiency|wasted)" || true
    echo ""
fi

if command -v trivy &>/dev/null; then
    echo "--- Vulnerability Quick Scan ---"
    trivy image --severity HIGH,CRITICAL --quiet "${IMAGE}" 2>/dev/null | head -20 || echo "(trivy scan failed or no issues)"
    echo ""
fi

echo "=== Audit Complete ==="
