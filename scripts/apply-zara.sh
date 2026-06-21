#!/usr/bin/env bash
# =============================================================================
# Zara Agent — Apply to OpenCode AI
# =============================================================================
# This script applies Zara agent configuration to your OpenCode AI setup.
# It can install globally (default) or per-project.
#
# Usage:
#   ./scripts/apply-zara.sh              # Apply globally to OpenCode
#   ./scripts/apply-zara.sh --project    # Apply to current project only
#   ./scripts/apply-zara.sh --uninstall  # Remove Zara from OpenCode
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="$(basename "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo '╔══════════════════════════════════════════════════════════════╗'
echo '║              Zara Agent — OpenCode Apply                    ║'
echo '╚══════════════════════════════════════════════════════════════╝'
echo -e "${NC}"

# =============================================================================
# Detect platform
# =============================================================================
detect_platform() {
    case "$(uname -s)" in
        Darwin)  echo "macos" ;;
        Linux)   echo "linux" ;;
        CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
        *)       echo "unknown" ;;
    esac
}

PLATFORM=$(detect_platform)
echo "Platform: $PLATFORM"
echo "Project:  $PROJECT_NAME ($SCRIPT_DIR)"
echo ""

# =============================================================================
# Determine OpenCode config directory
# =============================================================================
if [ "$PLATFORM" = "windows" ]; then
    OPENCODE_CONFIG_DIR="${APPDATA}/opencode"
    if [ ! -d "$OPENCODE_CONFIG_DIR" ]; then
        OPENCODE_CONFIG_DIR="${USERPROFILE}/.config/opencode"
    fi
else
    OPENCODE_CONFIG_DIR="${HOME}/.config/opencode"
fi

ZARA_LINK_NAME="${OPENCODE_CONFIG_DIR}/zara"
OPENCODE_JSON="${OPENCODE_CONFIG_DIR}/opencode.json"

# =============================================================================
# Mode: uninstall
# =============================================================================
if [ "${1:-}" = "--uninstall" ]; then
    echo -e "${YELLOW}[Uninstall]${NC} Removing Zara from OpenCode..."
    
    # Remove symlink
    if [ -L "$ZARA_LINK_NAME" ] || [ -d "$ZARA_LINK_NAME" ]; then
        rm -rf "$ZARA_LINK_NAME"
        echo -e "  ${GREEN}✓${NC} Removed $ZARA_LINK_NAME"
    fi
    
    # Remove CLI
    if [ -f "${HOME}/.local/bin/zara" ]; then
        rm -f "${HOME}/.local/bin/zara"
        echo -e "  ${GREEN}✓${NC} Removed ~/.local/bin/zara"
    fi
    
    echo ""
    echo -e "${GREEN}Zara has been removed from OpenCode.${NC}"
    echo "Project files remain at: $SCRIPT_DIR"
    exit 0
fi

# =============================================================================
# Mode: project-only
# =============================================================================
if [ "${1:-}" = "--project" ]; then
    echo -e "${CYAN}[Project Install]${NC} Applying Zara to current project..."
    
    # Ensure .opencode exists
    if [ ! -d "$SCRIPT_DIR/.opencode" ]; then
        echo -e "  ${RED}✗${NC} .opencode/ directory not found in project"
        exit 1
    fi
    
    echo -e "  ${GREEN}✓${NC} Project .opencode/ is ready"
    echo ""
    echo -e "To activate, add to your project's opencode.json:"
    echo '  {'
    echo '    "agent": { "name": "zara", "prompt": ".opencode/agent/zara.md" },'
    echo '    "agents": { ... }'
    echo '  }'
    echo ""
    echo -e "Or run without --project to install globally."
    exit 0
fi

# =============================================================================
# Mode: global install (default)
# =============================================================================
echo -e "${CYAN}[Global Install]${NC} Applying Zara to OpenCode config..."

# Step 1: Ensure OpenCode config directory exists
mkdir -p "$OPENCODE_CONFIG_DIR"
echo -e "  ${GREEN}✓${NC} OpenCode config dir: $OPENCODE_CONFIG_DIR"

# Step 2: Create symlink
if [ -L "$ZARA_LINK_NAME" ] || [ -e "$ZARA_LINK_NAME" ]; then
    echo -e "  ${YELLOW}○${NC} Removing existing Zara link..."
    rm -rf "$ZARA_LINK_NAME"
fi

if [ "$PLATFORM" = "windows" ]; then
    # Windows: use directory junction
    cmd //c "mklink /J \"$ZARA_LINK_NAME\" \"$SCRIPT_DIR/.opencode\"" > /dev/null 2>&1 || {
        cp -r "$SCRIPT_DIR/.opencode" "$ZARA_LINK_NAME"
    }
    echo -e "  ${GREEN}✓${NC} Zara linked at $ZARA_LINK_NAME"
else
    ln -sf "$SCRIPT_DIR/.opencode" "$ZARA_LINK_NAME"
    echo -e "  ${GREEN}✓${NC} Zara linked: $ZARA_LINK_NAME -> $SCRIPT_DIR/.opencode"
fi

# Step 3: Install CLI tool
mkdir -p "${HOME}/.local/bin"
if [ -f "$SCRIPT_DIR/tools/zara.sh" ]; then
    # Create wrapper script that sets ZARA_HOME
    cat > "${HOME}/.local/bin/zara" << 'WRAPPER'
#!/usr/bin/env bash
# Zara CLI wrapper
export ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
export ZARA_KNOWLEDGE_DIR="${ZARA_KNOWLEDGE_DIR:-$ZARA_HOME/knowledge}"
# Resolve script location portably (readlink -f is GNU-only; this works on macOS/BSD/Git Bash too)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
    DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [ "${SOURCE#/}" = "$SOURCE" ] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")/.." >/dev/null 2>&1 && pwd)"
# Try to find zara.sh in multiple locations
for loc in "$SCRIPT_DIR/tools/zara.sh" "$SCRIPT_DIR/../tools/zara.sh" "${HOME}/.config/opencode/zara/tools/zara.sh"; do
    if [ -f "$loc" ]; then
        exec bash "$loc" "$@"
    fi
done
echo "Zara CLI not found. Re-run apply-zara.sh to fix." >&2
exit 1
WRAPPER
    chmod +x "${HOME}/.local/bin/zara"
    echo -e "  ${GREEN}✓${NC} CLI installed: ~/.local/bin/zara"
fi

# Step 4: Ensure opencode.json references Zara
if [ -f "$OPENCODE_JSON" ]; then
    echo -e "  ${YELLOW}○${NC} opencode.json exists. You may need to add Zara manually."
    echo ""
    echo "Add to $OPENCODE_JSON:"
    echo '  "agent": { "name": "zara", "prompt": "zara/.opencode/agent/zara.md" }'
    echo ""
    echo "Or replace your opencode.json with:"
    echo "  ln -sf $SCRIPT_DIR/opencode.json $OPENCODE_JSON"
else
    # Create minimal opencode.json
    ln -sf "$SCRIPT_DIR/opencode.json" "$OPENCODE_JSON" 2>/dev/null || {
        cp "$SCRIPT_DIR/opencode.json" "$OPENCODE_JSON"
        echo -e "  ${GREEN}✓${NC} opencode.json created"
    }
fi

# Step 5: Create ZARA_HOME directory
ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
mkdir -p "$ZARA_HOME"/{skills,memory,sessions,agents}
echo -e "  ${GREEN}✓${NC} ZARA_HOME created: $ZARA_HOME"

# Step 6: Verify
echo ""
echo -e "${CYAN}Verification${NC}"
if command -v zara &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} 'zara' command available"
    echo "    $(command -v zara)"
else
    echo -e "  ${YELLOW}⚠${NC} Add ~/.local/bin to your PATH:"
    echo "    export PATH=\$PATH:\$HOME/.local/bin"
fi

if [ -d "$ZARA_LINK_NAME" ]; then
    echo -e "  ${GREEN}✓${NC} Zara linked at OpenCode config"
fi

# Step 7: Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Zara Applied Successfully                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  OpenCode:  $ZARA_LINK_NAME"
echo "║  CLI:       ~/.local/bin/zara"
echo "║  Home:      $ZARA_HOME"
echo "║  Project:   $SCRIPT_DIR"
echo "║                                                             ║"
echo "║  Next:                                                      ║"
echo "║  1. Restart OpenCode to activate                            ║"
echo "║  2. Run: /zara status (in OpenCode chat)                    ║"
echo "║  3. Edit $ZARA_HOME/.env to configure                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
