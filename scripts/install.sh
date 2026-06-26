#!/usr/bin/env bash
# =============================================================================
# Zara Agent - Cross-Platform Installation Script
# =============================================================================
# Supports: macOS, Linux, Windows (via Git Bash / WSL / Cygwin)
#
# Usage:
#   ./scripts/install.sh              # Interactive installation
#   ./scripts/install.sh --uninstall  # Remove Zara
#   ./scripts/install.sh --help       # Show help
# =============================================================================
set -euo pipefail

ZARA_VERSION="$(node -e "process.stdout.write(require('./version.json').version)" 2>/dev/null || echo "unknown")"

# Colors (disable on Windows CMD)
if [ "$TERM" = "dumb" ] || [ -z "${TERM:-}" ]; then
    GREEN=''; BLUE=''; YELLOW=''; CYAN=''; RED=''; NC=''
else
    GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
    CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
fi

# =============================================================================
# Platform Detection
# =============================================================================
detect_os() {
    case "$(uname -s)" in
        Darwin)  echo "macos" ;;
        Linux)   echo "linux" ;;
        CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
        *)       echo "unknown" ;;
    esac
}

detect_shell() {
    if [ -n "${BASH_VERSION:-}" ]; then echo "bash"
    elif [ -n "${ZSH_VERSION:-}" ]; then echo "zsh"
    elif [ -n "${KSH_VERSION:-}" ]; then echo "ksh"
    else echo "sh"
    fi
}

OS=$(detect_os)
SHELL_TYPE=$(detect_shell)
ARCH="$(uname -m)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}"
echo '╔══════════════════════════════════════════════════════════════╗'
echo "║              Zara Agent v${ZARA_VERSION} Installation             ║"
echo '╚══════════════════════════════════════════════════════════════╝'
echo -e "${NC}"
echo "Detected: $OS / $ARCH / Shell: $SHELL_TYPE"
echo "Source:   $SCRIPT_DIR"
echo ""

# =============================================================================
# Help / Uninstall
# =============================================================================
if [ "${1:-}" = "--help" ]; then
    echo "Usage: ./scripts/install.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help           Show this help"
    echo "  --uninstall      Remove Zara from the system"
    echo "  --openocode      Apply Zara to OpenCode AI (after install)"
    echo "  --claude         Apply Zara to Claude Code (after install)"
    echo ""
    echo "Environment variables:"
    echo "  ZARA_HOME        Runtime directory (default: ~/.zara)"
    echo "  ZARA_BIN         CLI binary directory (default: ~/.local/bin)"
    echo "  PREFIX           Installation prefix (default: \$ZARA_BIN)"
    exit 0
fi

if [ "${1:-}" = "--uninstall" ]; then
    echo -e "${YELLOW}[Uninstall]${NC} Removing Zara..."
    
    # Remove runtime
    ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
    if [ -d "$ZARA_HOME" ] && [[ "$ZARA_HOME" == *".zara"* ]]; then
        rm -rf "$ZARA_HOME"
        echo -e "  ${GREEN}✓${NC} Removed $ZARA_HOME"
    fi
    
    # Remove CLI
    ZARA_BIN="${ZARA_BIN:-$HOME/.local/bin}"
    if [ -f "$ZARA_BIN/zara" ]; then
        rm -f "$ZARA_BIN/zara"
        echo -e "  ${GREEN}✓${NC} Removed $ZARA_BIN/zara"
    fi
    
    # Clean Windows CLI
    if [ "$OS" = "windows" ]; then
        if [ -f "$ZARA_BIN/zara.cmd" ]; then
            rm -f "$ZARA_BIN/zara.cmd"
            echo -e "  ${GREEN}✓${NC} Removed $ZARA_BIN/zara.cmd"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}Zara has been uninstalled.${NC}"
    exit 0
fi

# =============================================================================
# Configuration
# =============================================================================

# Pre-flight: Node.js version check
NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)" 2>/dev/null || echo "0.0.0")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)
if [ "$NODE_MAJOR" -lt 22 ] || ([ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 14 ]); then
    echo -e "${RED}[ERROR]${NC} Node.js >= 22.14.0 required (found: $NODE_VERSION)"
    echo "  Install: https://nodejs.org or 'nvm install 22'"
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $NODE_VERSION (FTS5 compatible)"

if [ "$OS" = "windows" ]; then
    # Windows paths
    ZARA_HOME="${ZARA_HOME:-${USERPROFILE:-$HOME}/.zara}"
    ZARA_BIN="${ZARA_BIN:-${USERPROFILE:-$HOME}/.local/bin}"
    OPENCODE_CONFIG_DIR="${APPDATA:-${USERPROFILE:-$HOME}/.config}/opencode"
    [ ! -d "$OPENCODE_CONFIG_DIR" ] && OPENCODE_CONFIG_DIR="${USERPROFILE:-$HOME}/.config/opencode"
else
    ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
    ZARA_BIN="${ZARA_BIN:-$HOME/.local/bin}"
    OPENCODE_CONFIG_DIR="${HOME}/.config/opencode"
fi

mkdir -p "$ZARA_HOME/knowledge" "$ZARA_HOME/skills" "$ZARA_HOME/memory" "$ZARA_HOME/sessions" "$ZARA_HOME/agents"
mkdir -p "$ZARA_BIN"
mkdir -p "$OPENCODE_CONFIG_DIR"

# Install npm dependencies (required for semantic embedder)
echo -e "${CYAN}[0/6]${NC} Installing dependencies..."
if [ -f "$SCRIPT_DIR/package.json" ]; then
    (cd "$SCRIPT_DIR" && npm install --production --ignore-scripts 2>/dev/null) || echo -e "  ${YELLOW}⚠${NC} npm install failed (non-fatal, embedder may not work)"
fi

echo -e "${CYAN}[1/6]${NC} Installing Zara files..."

# Copy CLI tool
cp "$SCRIPT_DIR/tools/zara.sh" "$ZARA_HOME/zara.sh"
chmod +x "$ZARA_HOME/zara.sh"

# Install CLI based on platform
if [ "$OS" = "windows" ]; then
    # Windows: create .cmd wrapper (works without bash in PATH)
    cat > "$ZARA_BIN/zara.cmd" << 'WINCLI'
@echo off
REM Zara CLI for Windows
if "%ZARA_HOME%"=="" set ZARA_HOME=%USERPROFILE%\.zara
if "%ZARA_KNOWLEDGE_DIR%"=="" set ZARA_KNOWLEDGE_DIR=%ZARA_HOME%\knowledge

where bash >nul 2>nul
if errorlevel 1 (
    echo Zara requires Bash (install Git for Windows or WSL).
    echo Download: https://git-scm.com/download/win
    pause
    exit /b 1
)

bash "%ZARA_HOME%\zara.sh" %*
WINCLI
    echo -e "  ${GREEN}✓${NC} CLI: $ZARA_BIN/zara.cmd"
    
    # Also create symlink for bash users
    if command -v ln &>/dev/null; then
        ln -sf "$ZARA_HOME/zara.sh" "$ZARA_BIN/zara" 2>/dev/null || true
    fi
else
    # macOS / Linux: create symlink
    rm -f "$ZARA_BIN/zara"
    ln -sf "$ZARA_HOME/zara.sh" "$ZARA_BIN/zara"
    echo -e "  ${GREEN}✓${NC} CLI: $ZARA_BIN/zara -> $ZARA_HOME/zara.sh"
fi

# =============================================================================
echo -e "${CYAN}[2/6]${NC} Setting up configuration..."

if [ ! -f "$ZARA_HOME/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env.example" ]; then
        cp "$SCRIPT_DIR/.env.example" "$ZARA_HOME/.env"
        echo -e "  ${GREEN}✓${NC} Created $ZARA_HOME/.env"
    fi
else
    echo -e "  ${YELLOW}○${NC} Config already exists: $ZARA_HOME/.env"
fi

# =============================================================================
echo -e "${CYAN}[3/6]${NC} Applying Zara to OpenCode AI..."

# Create .opencode link in OpenCode config
OPENCODE_ZARA_LINK="$OPENCODE_CONFIG_DIR/zara"
if [ "$OS" = "windows" ]; then
    if command -v cmd &>/dev/null; then
        cmd //c "mklink /J \"$OPENCODE_ZARA_LINK\" \"$SCRIPT_DIR/.opencode\"" >nul 2>&1 || {
            cp -r "$SCRIPT_DIR/.opencode" "$OPENCODE_ZARA_LINK" 2>/dev/null || true
        }
    fi
else
    ln -sf "$SCRIPT_DIR/.opencode" "$OPENCODE_ZARA_LINK" 2>/dev/null || true
fi
echo -e "  ${GREEN}✓${NC} OpenCode config linked"

# =============================================================================
echo -e "${CYAN}[4/6]${NC} Setting up agent definitions..."

# Copy sub-agent prompts to ZARA_HOME
mkdir -p "$ZARA_HOME/agents"
for agent_file in "$SCRIPT_DIR/.opencode/agent/"*.md; do
    if [ -f "$agent_file" ]; then
        name=$(basename "$agent_file" .md)
        cp "$agent_file" "$ZARA_HOME/agents/$name.md" 2>/dev/null || true
    fi
done
echo -e "  ${GREEN}✓${NC} Agent definitions installed"

# =============================================================================
echo -e "${CYAN}[5/6]${NC} Setting up Claude Code (if available)..."

CLAUDE_CONFIG_DIR="${HOME}/.claude"
if [ -d "$CLAUDE_CONFIG_DIR" ]; then
    # Create Zara reference in Claude Code
    if [ -f "$SCRIPT_DIR/.claude/CLAUDE.md" ]; then
        # Check if Zara is already referenced
        if [ -f "$CLAUDE_CONFIG_DIR/CLAUDE.md" ]; then
            if ! grep -q "Zara" "$CLAUDE_CONFIG_DIR/CLAUDE.md" 2>/dev/null; then
                echo -e "\n---\n" >> "$CLAUDE_CONFIG_DIR/CLAUDE.md"
                cat "$SCRIPT_DIR/.claude/CLAUDE.md" >> "$CLAUDE_CONFIG_DIR/CLAUDE.md"
                echo -e "  ${GREEN}✓${NC} Zara added to Claude Code CLAUDE.md"
            else
                echo -e "  ${YELLOW}○${NC} Zara already referenced in Claude Code"
            fi
        else
            cp "$SCRIPT_DIR/.claude/CLAUDE.md" "$CLAUDE_CONFIG_DIR/CLAUDE.md"
            echo -e "  ${GREEN}✓${NC} Claude Code CLAUDE.md created"
        fi
    fi
else
    echo -e "  ${YELLOW}○${NC} Claude Code not found (skip)"
fi

# =============================================================================
echo -e "${CYAN}[6/6]${NC} Verifying installation..."

# Test CLI
if command -v zara &>/dev/null || [ -f "$ZARA_BIN/zara" ] || [ -f "$ZARA_BIN/zara.cmd" ]; then
    echo -e "  ${GREEN}✓${NC} Zara CLI installed"
    
    # Check PATH
    if ! command -v zara &>/dev/null && [ "$OS" != "windows" ]; then
        echo -e "  ${YELLOW}⚠${NC} Add to your PATH: export PATH=\"\$PATH:$ZARA_BIN\""
        SHELL_RC="${HOME}/.${SHELL_TYPE}rc"
        if [ -f "$SHELL_RC" ]; then
            echo "    Run: echo 'export PATH=\"\$PATH:$ZARA_BIN\"' >> $SHELL_RC"
        fi
    fi
else
    echo -e "  ${YELLOW}⚠${NC} CLI installation needs attention"
fi

# Test knowledge base
KB_COUNT=$(find "$SCRIPT_DIR/knowledge" -name "*.md" ! -name "_index.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$KB_COUNT" -gt 10 ]; then
    echo -e "  ${GREEN}✓${NC} Knowledge base: $KB_COUNT articles"
fi

# Test OpenCode config
if [ -d "$OPENCODE_ZARA_LINK" ] || [ -L "$OPENCODE_ZARA_LINK" ]; then
    echo -e "  ${GREEN}✓${NC} OpenCode integration ready"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Installation Complete                          ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Platform:  $OS / $ARCH"
echo "║  ZARA_HOME: $ZARA_HOME"
echo "║  CLI:       $ZARA_BIN/zara"
echo "║  Config:    $ZARA_HOME/.env"
echo "║  OpenCode:  $OPENCODE_ZARA_LINK"
echo "║  Knowledge: $KB_COUNT articles"
echo "║                                                             ║"
echo "║  Next steps:                                                ║"
echo "║  1. Edit $ZARA_HOME/.env with your settings            ║"
echo "║  2. Run: opencode (in any project directory)                ║"
echo "║  3. Set CONTEXT7_API_KEY for live docs (optional)           ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# MCP smoke test
echo ""
echo -e "${CYAN}[Smoke Test]${NC} MCP server..."
# Use gtimeout on macOS (GNU coreutils), timeout on Linux, skip on Windows
TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then TIMEOUT_CMD="timeout 15"
elif command -v gtimeout &>/dev/null; then TIMEOUT_CMD="gtimeout 15"
fi
MCP_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | $TIMEOUT_CMD node --experimental-sqlite "$SCRIPT_DIR/tools/mcp/index.mjs" 2>/dev/null | head -1)
if echo "$MCP_RESULT" | grep -q '"tools"'; then
    echo -e "  ${GREEN}✓${NC} MCP server responds"
else
    echo -e "  ${YELLOW}⚠${NC} MCP server did not respond (non-fatal)"
fi

# AI-mode: machine-readable output
if [ "${AI_MODE:-}" = "1" ] || [ "${1:-}" = "--ai-mode" ]; then
    echo ""
    echo "---AI_STATUS_JSON---"
    echo "{\"success\": true, \"platform\": \"$OS\", \"arch\": \"$ARCH\", \"node\": \"$NODE_VERSION\", \"zara_home\": \"$ZARA_HOME\", \"knowledge_articles\": $KB_COUNT}"
fi
