#!/usr/bin/env bash
# =============================================================================
# Zara Agent - Test Runner
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Zara Agent Test Suite                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

passed=0
failed=0
skipped=0

run_test() {
    local name="$1"
    local result="$2"
    
    if [ "$result" -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $name"
        passed=$((passed + 1))
    else
        echo -e "  ${RED}✗${NC} $name"
        failed=$((failed + 1))
    fi
}

# =============================================================================
# Test Group 1: Configuration Tests
# =============================================================================
echo -e "${CYAN}[Group 1] Configuration Tests${NC}"

# Test 1.1: .env.example exists
test -f "$SCRIPT_DIR/.env.example" && test -s "$SCRIPT_DIR/.env.example"
run_test ".env.example exists and non-empty" $?

# Test 1.2: opencode.json valid JSON
python3 -c "import json;json.load(open('$SCRIPT_DIR/opencode.json'))" 2>/dev/null
run_test "opencode.json is valid JSON" $?

echo ""

# =============================================================================
# Test Group 2: Structure Tests
# =============================================================================
echo -e "${CYAN}[Group 2] Repository Structure Tests${NC}"

# Test 2.1: Required directories exist
for dir in docs examples workflows tools scripts tests; do
    if [ ! -d "$SCRIPT_DIR/$dir" ]; then
        echo -e "  ${RED}✗${NC} Missing directory: $dir"
        failed=$((failed + 1))
    else
        echo -e "  ${GREEN}✓${NC} Directory exists: $dir"
        passed=$((passed + 1))
    fi
done

# Test 2.2: Required root files exist
for file in README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md ROADMAP.md; do
    if [ ! -f "$SCRIPT_DIR/$file" ]; then
        echo -e "  ${RED}✗${NC} Missing file: $file"
        failed=$((failed + 1))
    else
        echo -e "  ${GREEN}✓${NC} File exists: $file"
        passed=$((passed + 1))
    fi
done

echo ""

# =============================================================================
# Test Group 3: Prompt Tests
# =============================================================================
echo -e "${CYAN}[Group 3] Prompt File Tests${NC}"

# Test 3.1: Canonical instruction files exist
for prompt in ".opencode/instructions/system.md" ".opencode/agent/zara.md"; do
    if [ ! -f "$SCRIPT_DIR/$prompt" ]; then
        echo -e "  ${RED}✗${NC} Missing prompt: $prompt"
        failed=$((failed + 1))
    else
        echo -e "  ${GREEN}✓${NC} Prompt exists: $prompt"
        passed=$((passed + 1))
    fi
done

# Test 3.2: All 9 agent definitions exist in .opencode/agent/
for agent in zara sketch atlas lens probe shield pulse rhythm hive; do
    if [ ! -f "$SCRIPT_DIR/.opencode/agent/$agent.md" ]; then
        echo -e "  ${RED}✗${NC} Missing agent definition: $agent"
        failed=$((failed + 1))
    else
        echo -e "  ${GREEN}✓${NC} Agent definition exists: $agent"
        passed=$((passed + 1))
    fi
done

# Test 3.3: All agents also referenced in opencode.json
for agent_key in zara plan architect code-reviewer testing-lead security-reviewer delivery-lead swarm loop-engineer; do
    if grep -q "\"$agent_key\":" "$SCRIPT_DIR/opencode.json" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Agent in opencode.json: $agent_key"
        passed=$((passed + 1))
    else
        echo -e "  ${RED}✗${NC} Missing agent in opencode.json: $agent_key"
        failed=$((failed + 1))
    fi
done

echo ""

# =============================================================================
# Test Group 4: Documentation Tests
# =============================================================================
echo -e "${CYAN}[Group 4] Documentation Tests${NC}"

# Test 4.1: Documentation files exist
for doc in installation.md configuration.md architecture.md tools-reference.md prompts.md workflows.md faq.md memory.md plugins.md skills.md; do
    if [ ! -f "$SCRIPT_DIR/docs/$doc" ]; then
        echo -e "  ${RED}✗${NC} Missing doc: $doc"
        failed=$((failed + 1))
    else
        echo -e "  ${GREEN}✓${NC} Doc exists: $doc"
        passed=$((passed + 1))
    fi
done

# Test 4.2: README has required sections
if grep -q "^## Features" "$SCRIPT_DIR/README.md" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} README has Features section"
    passed=$((passed + 1))
else
    echo -e "  ${YELLOW}⚠${NC} README missing Features section (will be created)"
fi

echo ""

# =============================================================================
# Test Group 5: Security Tests
# =============================================================================
echo -e "${CYAN}[Group 5] Security Tests${NC}"

# Test 5.1: No hardcoded API keys (excluding audit/report/test docs)
EXCLUDE_PATTERNS="AUDIT.md|SECURITY_REVIEW.md|MIGRATION_REPORT.md|test.sh|node_modules|docs/research"
if grep -r "ctx7sk-" "$SCRIPT_DIR" --include="*.md" --include="*.yaml" --include="*.json" --include="*.sh" 2>/dev/null \
    | grep -v ".env.example" | grep -vE "$EXCLUDE_PATTERNS" > /dev/null; then
    echo -e "  ${RED}✗${NC} Hardcoded API key found!"
    failed=$((failed + 1))
else
    echo -e "  ${GREEN}✓${NC} No hardcoded API keys"
    passed=$((passed + 1))
fi

# Test 5.2: No personal paths (excluding audit/report/test docs)
if grep -rE "/Users/[a-zA-Z]+|/home/[a-zA-Z]+" "$SCRIPT_DIR" --include="*.md" --include="*.yaml" --include="*.json" --include="*.sh" 2>/dev/null \
    | grep -vE "$EXCLUDE_PATTERNS" > /dev/null; then
    echo -e "  ${RED}✗${NC} Personal paths found!"
    failed=$((failed + 1))
else
    echo -e "  ${GREEN}✓${NC} No personal paths"
    passed=$((passed + 1))
fi

# Test 5.3: No secrets in .gitignore
if grep -q ".env" "$SCRIPT_DIR/.gitignore" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} .env in .gitignore"
    passed=$((passed + 1))
else
    echo -e "  ${YELLOW}⚠${NC} .env not in .gitignore"
fi

echo ""

# =============================================================================
# Test Group 6: Example Tests
# =============================================================================
echo -e "${CYAN}[Group 6] Example Tests${NC}"

for example in basic coding devops research automation; do
    if [ -f "$SCRIPT_DIR/examples/$example/README.md" ]; then
        echo -e "  ${GREEN}✓${NC} Example exists: $example"
        passed=$((passed + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} Missing example: $example"
    fi
done

echo ""

# =============================================================================
# Test Group 7: Knowledge Base Tests
# =============================================================================
echo -e "${CYAN}[Group 7] Knowledge Base Tests${NC}"

if [ -f "$SCRIPT_DIR/knowledge/INDEX.md" ] && [ -f "$SCRIPT_DIR/knowledge/SUMMARY.md" ]; then
    echo -e "  ${GREEN}✓${NC} Knowledge index and summary exist"
    passed=$((passed + 1))
else
    echo -e "  ${YELLOW}⚠${NC} Knowledge index/summary missing"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
total=$((passed + failed))
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Test Results                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo -e "║  ${GREEN}Passed: $passed${NC}                                              ║"
echo -e "║  ${RED}Failed: $failed${NC}                                              ║"
echo -e "║  Total: $total                                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"

exit "$failed"
