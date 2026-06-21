#!/usr/bin/env bash
# =============================================================================
# Zara Agent — Apply to Claude Code
# =============================================================================
# This script applies Zara agent configuration to your Claude Code setup.
#
# Usage:
#   ./scripts/install-claude.sh                  # Apply to Claude Code
#   ./scripts/install-claude.sh --uninstall      # Remove from Claude Code
#   ./scripts/install-claude.sh --help           # Show help
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="$(basename "$SCRIPT_DIR")"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

# =============================================================================
# Platform detection
# =============================================================================
case "$(uname -s)" in
    Darwin|Linux)
        CLAUDE_CONFIG_DIR="${HOME}/.claude"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        CLAUDE_CONFIG_DIR="${USERPROFILE}/.claude"
        ;;
    *)
        echo -e "${RED}Unsupported platform${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}"
echo '╔══════════════════════════════════════════════════════════════╗'
echo '║        Zara Agent — Claude Code Install                    ║'
echo '╚══════════════════════════════════════════════════════════════╝'
echo -e "${NC}"
echo "Claude config: $CLAUDE_CONFIG_DIR"
echo "Project:       $SCRIPT_DIR"
echo ""

# =============================================================================
# Help
# =============================================================================
if [ "${1:-}" = "--help" ]; then
    echo "Usage: ./scripts/install-claude.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help           Show this help"
    echo "  --uninstall      Remove Zara from Claude Code"
    echo ""
    echo "This script:"
    echo "  1. Adds Zara identity to Claude Code's CLAUDE.md"
    echo "  2. Sets up sub-agent references for domain-specific work"
    echo "  3. Links the knowledge base for easy access"
    exit 0
fi

# =============================================================================
# Uninstall
# =============================================================================
if [ "${1:-}" = "--uninstall" ]; then
    echo -e "${YELLOW}[Uninstall]${NC} Removing Zara from Claude Code..."
    
    if [ -f "$CLAUDE_CONFIG_DIR/CLAUDE.md" ]; then
        # Remove Zara section from CLAUDE.md
        if grep -q "Zara" "$CLAUDE_CONFIG_DIR/CLAUDE.md" 2>/dev/null; then
            # Create a temporary file without the Zara section
            tmp=$(mktemp)
            awk '/^# Zara -- Lead Engineering Orchestrator/{flag=1; next} /^---/{if(flag) flag=0} !flag' \
                "$CLAUDE_CONFIG_DIR/CLAUDE.md" > "$tmp" 2>/dev/null || true
            mv "$tmp" "$CLAUDE_CONFIG_DIR/CLAUDE.md" 2>/dev/null || true
            echo -e "  ${GREEN}✓${NC} Zara section removed from CLAUDE.md"
        else
            echo -e "  ${YELLOW}○${NC} Zara not found in CLAUDE.md"
        fi
    fi
    
    echo -e "${GREEN}Zara removed from Claude Code.${NC}"
    exit 0
fi

# =============================================================================
# Install
# =============================================================================

# Step 1: Ensure Claude config directory exists
mkdir -p "$CLAUDE_CONFIG_DIR"
echo -e "${CYAN}[1/4]${NC} Claude config directory ready"

# Step 2: Add Zara to CLAUDE.md
CLAUDE_MD="$CLAUDE_CONFIG_DIR/CLAUDE.md"
ZARA_SECTION="$SCRIPT_DIR/.claude/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
    # Check if Zara already referenced
    if grep -q "Zara" "$CLAUDE_MD" 2>/dev/null; then
        echo -e "  ${YELLOW}○${NC} Zara already referenced in CLAUDE.md"
    else
        # Append Zara section
        echo -e "\n---\n" >> "$CLAUDE_MD"
        cat "$ZARA_SECTION" >> "$CLAUDE_MD"
        echo -e "  ${GREEN}✓${NC} Zara added to CLAUDE.md"
    fi
else
    cp "$ZARA_SECTION" "$CLAUDE_MD"
    echo -e "  ${GREEN}✓${NC} CLAUDE.md created with Zara identity"
fi

# Step 3: Create Zara sub-agent references
echo -e "${CYAN}[3/4]${NC} Setting up sub-agent references..."
AGENTS_DIR="$CLAUDE_CONFIG_DIR/agents"
mkdir -p "$AGENTS_DIR"

# Link to .opencode agent definitions (single source of truth)
for agent_file in "$SCRIPT_DIR/.opencode/agent/"*.md; do
    if [ -f "$agent_file" ]; then
        name=$(basename "$agent_file" .md)
        # Skip zara.md (it's the orchestrator itself)
        if [ "$name" = "zara" ]; then continue; fi
        ln -sf "$agent_file" "$AGENTS_DIR/$name.md" 2>/dev/null || \
        cp "$agent_file" "$AGENTS_DIR/$name.md" 2>/dev/null || true
    fi
done
echo -e "  ${GREEN}✓${NC} ${AGENTS_DIR}"

# Step 4: Link knowledge base for easy access
echo -e "${CYAN}[4/4]${NC} Linking knowledge base..."
KNOWLEDGE_LINK="$CLAUDE_CONFIG_DIR/zara-knowledge"
if [ -d "$SCRIPT_DIR/knowledge" ]; then
    ln -sf "$SCRIPT_DIR/knowledge" "$KNOWLEDGE_LINK" 2>/dev/null || true
    KB_COUNT=$(find "$SCRIPT_DIR/knowledge" -name "*.md" ! -name "_index.md" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Knowledge base linked ($KB_COUNT articles)"
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Zara installed for Claude Code                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  CLAUDE.md: $CLAUDE_MD"
echo "║  Agents:    $AGENTS_DIR"
echo "║  Knowledge: $KNOWLEDGE_LINK ($KB_COUNT articles)"
echo "║                                                             ║"
echo "║  Usage:                                                     ║"
echo "║  - Mention 'Zara' to activate orchestrator mode             ║"
echo "║  - Ask for architecture review, code review, testing, etc.  ║"
echo "║  - Reference knowledge/ articles for grounded decisions     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
