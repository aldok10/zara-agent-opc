#!/usr/bin/env bash
# =============================================================================
# Zara Agent - Knowledge Base Setup Script
# =============================================================================
# This script downloads the DevIQ knowledge base articles.
# The DevIQ knowledge base is licensed under CC BY 4.0
# (https://creativecommons.org/licenses/by/4.0/)
# Knowledge sourced from: https://deviq.com
# =============================================================================
set -euo pipefail

ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
KNOWLEDGE_DIR="${ZARA_KNOWLEDGE_DIR:-$ZARA_HOME/knowledge}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Zara Knowledge Base Setup                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Ensure target directory exists
mkdir -p "$KNOWLEDGE_DIR"

# Copy index and summary from repo
if [ -f "$SCRIPT_DIR/knowledge/INDEX.md" ]; then
    cp "$SCRIPT_DIR/knowledge/INDEX.md" "$KNOWLEDGE_DIR/INDEX.md"
    echo "  ✓ INDEX.md copied"
fi
if [ -f "$SCRIPT_DIR/knowledge/SUMMARY.md" ]; then
    cp "$SCRIPT_DIR/knowledge/SUMMARY.md" "$KNOWLEDGE_DIR/SUMMARY.md"
    echo "  ✓ SUMMARY.md copied"
fi

echo ""
echo "Knowledge base location: $KNOWLEDGE_DIR"
echo ""
echo "To download the full DevIQ knowledge base, visit:"
echo "  https://github.com/your-org/zara-knowledge-base"
echo ""
echo "Or set up your own knowledge base with:"
echo "  1. Create section directories under $KNOWLEDGE_DIR"
echo "  2. Add markdown articles in each section"
echo "  3. Update INDEX.md with article listings"
echo ""
echo "Minimum required structure:"
echo "  $KNOWLEDGE_DIR/"
echo "  ├── INDEX.md"
echo "  ├── SUMMARY.md"
echo "  ├── antipatterns/"
echo "  ├── architecture/"
echo "  ├── code-smells/"
echo "  ├── design-patterns/"
echo "  ├── domain-driven-design/"
echo "  ├── laws/"
echo "  ├── practices/"
echo "  ├── principles/"
echo "  ├── terms/"
echo "  ├── testing/"
echo "  ├── tools/"
echo "  └── values/"
