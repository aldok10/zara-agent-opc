#!/usr/bin/env bash
# =============================================================================
# Zara Agent - Configuration Validator
# =============================================================================
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Zara Configuration Validation                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

errors=0
warnings=0

# --- Check environment variables ---
check_env() {
    local var="$1"
    local default="$2"
    local desc="$3"
    
    if [ -n "${!var:-}" ]; then
        echo "  ✓ $var = ${!var:0:50}..."
    elif [ -n "$default" ]; then
        echo "  ○ $var not set (default: $default) — $desc"
    else
        echo "  ⚠ $var not set — $desc"
        warnings=$((warnings + 1))
    fi
}

echo "--- Environment Variables ---"
check_env "ZARA_HOME" "\$HOME/.zara" "Root directory for Zara runtime"
check_env "CONTEXT7_API_KEY" "" "API key for live documentation fetching (optional but recommended)"
check_env "ZARA_KNOWLEDGE_DIR" "\$ZARA_HOME/knowledge" "Knowledge base path"
check_env "ZARA_SKILLS_DIR" "\$ZARA_HOME/skills" "Skills directory"
check_env "ZARA_MEMORY_DIR" "\$ZARA_HOME/memory" "Memory directory"
echo ""

# --- Check directories ---
echo "--- Directory Checks ---"
ZARA_HOME_DIR="${ZARA_HOME:-$HOME/.zara}"
for dir in "$ZARA_HOME_DIR" "$ZARA_HOME_DIR/knowledge" "$ZARA_HOME_DIR/skills" "$ZARA_HOME_DIR/memory" "$ZARA_HOME_DIR/agents"; do
    if [ -d "$dir" ]; then
        echo "  ✓ $dir"
    else
        echo "  ○ $dir (will be created on first run)"
    fi
done
echo ""

# --- Check CLI ---
echo "--- CLI Checks ---"
if command -v zara &>/dev/null; then
    echo "  ✓ 'zara' command found in PATH"
    zara_path=$(command -v zara)
    echo "    Location: $zara_path"
else
    echo "  ⚠ 'zara' command not in PATH"
    warnings=$((warnings + 1))
fi
echo ""

# --- Check dependencies ---
echo "--- Dependency Checks ---"
for cmd in bash grep find sed; do
    if command -v "$cmd" &>/dev/null; then
        echo "  ✓ $cmd found"
    else
        echo "  ✗ $cmd not found"
        errors=$((errors + 1))
    fi
done
echo ""

# --- Check config file ---
echo "--- Config File Checks ---"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/config.yaml" ]; then
    echo "  ✓ config.yaml found"
else
    echo "  ⚠ config.yaml not found"
    warnings=$((warnings + 1))
fi

if [ -f "$SCRIPT_DIR/.env.example" ]; then
    echo "  ✓ .env.example found"
else
    echo "  ⚠ .env.example not found"
    warnings=$((warnings + 1))
fi
echo ""

# --- Results ---
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Validation Results                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
if [ "$errors" -eq 0 ] && [ "$warnings" -eq 0 ]; then
    echo "║  ✓ All checks passed                                     ║"
elif [ "$errors" -eq 0 ]; then
    echo "║  ✓ No errors, $warnings warning(s)                              ║"
else
    echo "║  ✗ $errors error(s), $warnings warning(s)                            ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"

exit "$errors"
