#!/usr/bin/env bash
# =============================================================================
# Zara — Lead Engineering Orchestrator CLI
# =============================================================================
# Hermes-inspired multi-agent orchestrator with knowledge base
# Usage: ./zara.sh [command] [options]
# =============================================================================
set -euo pipefail

# =============================================================================
# Configuration (can be overridden by environment variables)
# =============================================================================
ZARA_HOME="${ZARA_HOME:-$HOME/.zara}"
KNOWLEDGE_DIR="${ZARA_KNOWLEDGE_DIR:-$ZARA_HOME/knowledge}"
SKILLS_DIR="${ZARA_SKILLS_DIR:-$ZARA_HOME/skills}"
MEMORY_DIR="${ZARA_MEMORY_DIR:-$ZARA_HOME/memory}"
AGENTS_DIR="${ZARA_AGENTS_DIR:-$ZARA_HOME/agents}"
SESSIONS_DIR="${ZARA_SESSIONS_DIR:-$ZARA_HOME/sessions}"
INDEX_FILE="$KNOWLEDGE_DIR/INDEX.md"
SUMMARY_FILE="$KNOWLEDGE_DIR/SUMMARY.md"
JOURNAL_FILE="$MEMORY_DIR/journal.jsonl"
SKILLS_INDEX="$MEMORY_DIR/skills-index.json"
AGENT_NAME="${ZARA_AGENT_NAME:-Zara}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================
ensure_dirs() {
    mkdir -p "$SKILLS_DIR" "$MEMORY_DIR" "$SESSIONS_DIR" "$AGENTS_DIR"
}

print_banner() {
    echo -e "${BLUE}"
    echo '╔══════════════════════════════════════════════════════════════╗'
    echo "║                     ${AGENT_NAME} - v1.0.0                        ║"
    echo '║           Lead Engineering Orchestrator                    ║'
    echo '╚══════════════════════════════════════════════════════════════╝'
    echo -e "${NC}"
}

# =============================================================================
# Command: help
# =============================================================================
show_help() {
    print_banner
    echo "Usage: ./zara.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  help                    Show this help"
    echo "  status                  Show system status"
    echo "  search <query>          Search knowledge base"
    echo "  knowledge <section>     List articles in a section"
    echo "  read <section/article>  Read a specific article"
    echo "  agents                  List available sub-agents"
    echo "  agent <name>            Show agent details"
    echo "  skills                  List all skills"
    echo "  skill <name>            Show skill details"
    echo "  learn <file>            Import a skill file"
    echo "  journal                 Show recent journal entries"
    echo "  session <name>          Start a new session"
    echo ""
    echo "Sections:"
    echo "  Configure DEVIQ_KNOWLEDGE_SECTIONS env variable"
    echo "  Default: antipatterns, architecture, code-smells, design-patterns,"
    echo "           domain-driven-design, laws, practices, principles, terms,"
    echo "           testing, tools, values"
    echo ""
    echo "Example: ./zara.sh search \"clean architecture\""
    echo "         ./zara.sh knowledge principles"
    echo "         ./zara.sh read principles/single-responsibility-principle"
    echo ""
    echo "Environment variables:"
    echo "  ZARA_HOME            Agent home directory (default: ~/.zara)"
    echo "  ZARA_KNOWLEDGE_DIR   Knowledge base path"
    echo "  ZARA_SKILLS_DIR      Skills directory"
    echo "  ZARA_MEMORY_DIR      Memory directory"
    echo "  ZARA_AGENT_NAME      Agent display name"
    echo "  DEVIQ_KNOWLEDGE_PATH Path to DevIQ knowledge base"
}

# =============================================================================
# Command: status
# =============================================================================
show_status() {
    print_banner
    echo -e "${CYAN}System Status${NC}"
    echo ""

    # Count knowledge articles
    article_count=0
    if [ -d "$KNOWLEDGE_DIR" ]; then
        for section in "$KNOWLEDGE_DIR"/*/; do
            if [ -d "$section" ] && [ "$(basename "$section")" != "images" ]; then
                count=$(find -L "$section" -name "*.md" ! -name "_index.md" 2>/dev/null | wc -l | tr -d ' ')
                article_count=$((article_count + count))
            fi
        done
    fi
    echo -e "  ${GREEN}✓${NC} Knowledge Base: $article_count articles"

    # Count agents
    agent_count=$(ls "$AGENTS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Sub-Agents: $agent_count registered"

    # Count skills
    skill_count=$(ls "$SKILLS_DIR"/*.md 2>/dev/null | grep -v README | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Skills: $skill_count"

    # Session count
    session_count=$(ls "$SESSIONS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Sessions: $session_count completed"

    # Journal entries
    journal_count=0
    if [ -f "$JOURNAL_FILE" ]; then
        journal_count=$(wc -l < "$JOURNAL_FILE" | tr -d ' ')
    fi
    echo -e "  ${GREEN}✓${NC} Journal Entries: $journal_count"

    echo ""
    echo -e "${CYAN}Sub-Agents${NC}"
    for agent_file in "$AGENTS_DIR"/*.md; do
        if [ -f "$agent_file" ]; then
            name=$(basename "$agent_file" .md)
            desc=$(grep -m1 "^#" "$agent_file" 2>/dev/null | sed 's/^#* *//')
            echo -e "  ${BLUE}→${NC} $name: $desc"
        fi
    done
}

# =============================================================================
# Command: search
# =============================================================================
search_knowledge() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh search <query>${NC}"
        exit 1
    fi
    query="$*"

    echo -e "${CYAN}Searching knowledge base for:${NC} $query"
    echo ""

    if [ ! -d "$KNOWLEDGE_DIR" ]; then
        echo -e "  ${YELLOW}Knowledge directory not found: $KNOWLEDGE_DIR${NC}"
        echo -e "  ${YELLOW}Set DEVIQ_KNOWLEDGE_PATH or ZARA_KNOWLEDGE_DIR${NC}"
        exit 0
    fi

    results=$(find -L "$KNOWLEDGE_DIR" -name "*.md" ! -name "_index.md" ! -name "INDEX.md" ! -name "SUMMARY.md" 2>/dev/null \
        | while read -r file; do
            if grep -qi "$query" "$file" 2>/dev/null; then
                title=$(grep -m1 "^title: " "$file" 2>/dev/null | sed 's/^title: *//' || echo "$(basename "$file" .md)")
                rel_path="${file#$KNOWLEDGE_DIR/}"
                echo "  ${BLUE}→${NC} $rel_path — $title"
            fi
        done)

    if [ -z "$results" ]; then
        echo -e "  ${YELLOW}(no results found)${NC}"
    else
        echo "$results"
    fi
    echo ""
    echo -e "${YELLOW}Tip:${NC} Use 'read <section/article>' to open an article"
}

# =============================================================================
# Command: knowledge
# =============================================================================
list_knowledge_section() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh knowledge <section>${NC}"
        if [ -d "$KNOWLEDGE_DIR" ]; then
            sections=$(ls "$KNOWLEDGE_DIR" | grep -v -E 'INDEX\.md|SUMMARY\.md|images' | tr '\n' ' ')
            echo "Sections: $sections"
        fi
        exit 1
    fi
    section="$1"
    section_dir="$KNOWLEDGE_DIR/$section"

    if [ ! -d "$section_dir" ] && [ ! -L "$section_dir" ]; then
        echo -e "${RED}Section '$section' not found${NC}"
        if [ -d "$KNOWLEDGE_DIR" ]; then
            sections=$(ls "$KNOWLEDGE_DIR" | grep -v -E 'INDEX\.md|SUMMARY\.md|images' | tr '\n' ' ')
            echo "Sections: $sections"
        fi
        exit 1
    fi

    echo -e "${CYAN}Section:${NC} $section"
    echo ""

    articles=$(find -L "$section_dir" -name "*.md" ! -name "_index.md" 2>/dev/null | sort)
    count=0
    for article in $articles; do
        title=$(grep -m1 "^title: " "$article" 2>/dev/null | sed 's/^title: *//' || echo "$(basename "$article" .md)")
        echo "  ${GREEN}○${NC} $(basename "$article" .md)"
        echo "    $title"
        count=$((count + 1))
    done
    echo ""
    echo -e "${GREEN}$count articles${NC}"
    echo -e "${YELLOW}Tip:${NC} Use 'read $section/<article>' to open an article"
}

# =============================================================================
# Command: read
# =============================================================================
read_article() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh read <section/article>${NC}"
        exit 1
    fi
    path="$1"
    article_path="$KNOWLEDGE_DIR/$path.md"

    if [ ! -f "$article_path" ] && [ -f "$KNOWLEDGE_DIR/$path" ]; then
        article_path="$KNOWLEDGE_DIR/$path"
    fi

    if [ ! -f "$article_path" ]; then
        echo -e "${RED}Article not found: $path${NC}"
        exit 1
    fi

    # Render with bat if available, otherwise cat
    if command -v bat &>/dev/null; then
        bat --style=header,grid --language=markdown "$article_path"
    else
        echo -e "${CYAN}━━━ $path ━━━${NC}"
        cat "$article_path"
    fi
}

# =============================================================================
# Command: agents
# =============================================================================
list_agents() {
    print_banner
    echo -e "${CYAN}Available Sub-Agents${NC}"
    echo ""
    for agent_file in "$AGENTS_DIR"/*.md; do
        if [ -f "$agent_file" ]; then
            name=$(basename "$agent_file" .md)
            desc=$(grep -m1 "^#" "$agent_file" 2>/dev/null | sed 's/^#* *//')
            echo -e "${BLUE}━━━ $name ━━━${NC}"
            echo "  $desc"
            echo ""
        fi
    done
}

# =============================================================================
# Command: agent
# =============================================================================
show_agent() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh agent <name>${NC}"
        echo "Agents: $(ls "$AGENTS_DIR"/*.json 2>/dev/null | xargs -I{} basename {} .json | tr '\n' ' ')"
        exit 1
    fi
    name="$1"
    agent_file="$AGENTS_DIR/$name.md"

    if [ ! -f "$agent_file" ]; then
        echo -e "${RED}Agent '$name' not found${NC}"
        echo "Agents: $(ls "$AGENTS_DIR"/*.md 2>/dev/null | xargs -I{} basename {} .md | tr '\n' ' ')"
        exit 1
    fi

    if command -v bat &>/dev/null; then
        bat --style=header,grid --language=markdown "$agent_file"
    else
        cat "$agent_file"
    fi
}

# =============================================================================
# Command: skills
# =============================================================================
list_skills() {
    echo -e "${CYAN}Skills${NC}"
    echo ""
    for skill_file in "$SKILLS_DIR"/*.md; do
        if [ -f "$skill_file" ]; then
            name=$(basename "$skill_file" .md)
            if [ "$name" = "README" ]; then continue; fi
            title=$(grep -m1 "^# Skill:" "$skill_file" 2>/dev/null | sed 's/^# Skill: *//' || echo "$name")
            echo "  ${GREEN}⚡${NC} $name — $title"
        fi
    done
    echo ""
    total=$(ls "$SKILLS_DIR"/*.md 2>/dev/null | grep -v README | wc -l | tr -d ' ')
    echo -e "${YELLOW}Total: $total skills${NC}"
}

# =============================================================================
# Command: skill
# =============================================================================
show_skill() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh skill <name>${NC}"
        exit 1
    fi
    name="$1"
    skill_file="$SKILLS_DIR/$name.md"

    if [ ! -f "$skill_file" ]; then
        echo -e "${RED}Skill '$name' not found${NC}"
        exit 1
    fi

    if command -v bat &>/dev/null; then
        bat --style=header,grid --language=markdown "$skill_file"
    else
        cat "$skill_file"
    fi
}

# =============================================================================
# Command: learn
# =============================================================================
import_skill() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh learn <file>${NC}"
        exit 1
    fi
    src="$1"
    if [ ! -f "$src" ]; then
        echo -e "${RED}File not found: $src${NC}"
        exit 1
    fi
    name=$(basename "$src" .md)
    cp "$src" "$SKILLS_DIR/$name.md"
    echo -e "${GREEN}✓${NC} Skill imported: $name"

    # Update skills index if it exists
    if [ -f "$SKILLS_INDEX" ]; then
        tmp=$(mktemp)
        python3 -c "
import json, sys
with open('$SKILLS_INDEX') as f:
    idx = json.load(f)
idx['skills']['$name'] = {
    'title': '$name',
    'tags': ['imported'],
    'use_count': 0,
    'created': '$(date +%Y-%m-%d)',
    'last_used': None,
    'deprecated': False
}
idx['last_updated'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('$SKILLS_INDEX', 'w') as f:
    json.dump(idx, f, indent=2)
" 2>/dev/null || true
        rm -f "$tmp"
    fi
}

# =============================================================================
# Command: journal
# =============================================================================
show_journal() {
    if [ ! -f "$JOURNAL_FILE" ]; then
        echo -e "${YELLOW}No journal entries yet.${NC}"
        exit 0
    fi
    echo -e "${CYAN}Recent Journal Entries${NC}"
    echo ""
    tac "$JOURNAL_FILE" 2>/dev/null || tail -r "$JOURNAL_FILE" 2>/dev/null || tail -20 "$JOURNAL_FILE"
    echo ""
    echo -e "${YELLOW}Total entries: $(wc -l < "$JOURNAL_FILE" | tr -d ' ')${NC}"
}

# =============================================================================
# Command: session
# =============================================================================
start_session() {
    if [ $# -eq 0 ]; then
        echo -e "${RED}Usage: ./zara.sh session <name>${NC}"
        exit 1
    fi
    name="$*"
    safe_name=$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    date_stamp=$(date +%Y-%m-%d)
    session_file="$SESSIONS_DIR/${date_stamp}_${safe_name}.md"

    if [ -f "$session_file" ]; then
        echo -e "${YELLOW}Session already exists: $session_file${NC}"
        echo -e "${YELLOW}Appending...${NC}"
    fi

    cat >> "$session_file" << EOF
# Session: $name
**Date**: $(date '+%Y-%m-%d %H:%M')
**Status**: in-progress

## Goal

## Sub-Agents Engaged

## Key Decisions

## Outcomes

## Skills Created / Refined

## Journal Entry

EOF

    echo -e "${GREEN}✓${NC} Session started: $session_file"
    if command -v code &>/dev/null; then
        code "$session_file"
    elif command -v vim &>/dev/null; then
        vim "$session_file"
    elif command -v nano &>/dev/null; then
        nano "$session_file"
    fi
}

# =============================================================================
# Main Dispatch
# =============================================================================
ensure_dirs

if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

command="$1"
shift

case "$command" in
    help|-h|--help)
        show_help
        ;;
    status)
        show_status
        ;;
    search)
        search_knowledge "$@"
        ;;
    knowledge|section|list)
        list_knowledge_section "$@"
        ;;
    read|view|article)
        read_article "$@"
        ;;
    agents|sub-agents)
        list_agents
        ;;
    agent|sub-agent)
        show_agent "$@"
        ;;
    skills)
        list_skills
        ;;
    skill)
        show_skill "$@"
        ;;
    learn|import)
        import_skill "$@"
        ;;
    journal|log)
        show_journal
        ;;
    session|start)
        start_session "$@"
        ;;
    *)
        echo -e "${RED}Unknown command: $command${NC}"
        show_help
        exit 1
        ;;
esac
