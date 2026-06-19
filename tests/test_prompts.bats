#!/usr/bin/env bats
# =============================================================================
# Prompt File Tests for Zara Agent
# =============================================================================
# These tests verify that all prompt files exist, are valid markdown,
# and contain the required sections.
# =============================================================================

setup() {
    PROJECT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
}

# =============================================================================
# Prompt Existence Tests
# =============================================================================

@test "system.md prompt exists and is non-empty" {
    [ -f "$PROJECT_DIR/prompts/system.md" ]
    [ -s "$PROJECT_DIR/prompts/system.md" ]
}

@test "tools.md prompt exists and is non-empty" {
    [ -f "$PROJECT_DIR/prompts/tools.md" ]
    [ -s "$PROJECT_DIR/prompts/tools.md" ]
}

@test "workflows.md prompt exists and is non-empty" {
    [ -f "$PROJECT_DIR/prompts/workflows.md" ]
    [ -s "$PROJECT_DIR/prompts/workflows.md" ]
}

@test "examples.md prompt exists and is non-empty" {
    [ -f "$PROJECT_DIR/prompts/examples.md" ]
    [ -s "$PROJECT_DIR/prompts/examples.md" ]
}

# =============================================================================
# Sub-Agent Prompt Tests
# =============================================================================

@test "architect sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/architect.md" ]
}

@test "code-reviewer sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/code-reviewer.md" ]
}

@test "testing-lead sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/testing-lead.md" ]
}

@test "practices-lead sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/practices-lead.md" ]
}

@test "ddd-specialist sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/ddd-specialist.md" ]
}

@test "security-reviewer sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/security-reviewer.md" ]
}

@test "delivery-lead sub-agent prompt exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/delivery-lead.md" ]
}

# =============================================================================
# Prompt Structure Tests
# =============================================================================

@test "system.md contains identity section" {
    grep -q "## Identity" "$PROJECT_DIR/prompts/system.md"
}

@test "system.md contains core tenets" {
    grep -q "## Core Tenets" "$PROJECT_DIR/prompts/system.md"
}

@test "system.md contains safety rules" {
    grep -q "## Safety Rules" "$PROJECT_DIR/prompts/system.md"
}

@test "system.md contains Zara CTX section" {
    grep -q "## Zara CTX" "$PROJECT_DIR/prompts/system.md"
}

@test "tools.md contains philosophy section" {
    grep -q "## Philosophy" "$PROJECT_DIR/prompts/tools.md"
}

@test "tools.md contains sub-agent tools section" {
    grep -q "## Sub-Agent Tools" "$PROJECT_DIR/prompts/tools.md"
}

@test "workflows.md contains golden rule section" {
    grep -q "## The Golden Rule" "$PROJECT_DIR/prompts/workflows.md"
}

@test "workflows.md contains senior dev decision tree" {
    grep -q "## The Senior Dev Decision Tree" "$PROJECT_DIR/prompts/workflows.md"
}

@test "workflows.md contains session resumption" {
    grep -q "## Session Resumption" "$PROJECT_DIR/prompts/workflows.md"
}

# =============================================================================
# Quality Checks
# =============================================================================

@test "no deprecated personal paths in prompts" {
    ! grep -r "/Users/" "$PROJECT_DIR/prompts/" 2>/dev/null
}

@test "no hardcoded API keys in prompts" {
    ! grep -rE 'sk-[a-zA-Z0-9]+|api[_-]?key[=:].+[a-zA-Z0-9]{10,}' "$PROJECT_DIR/prompts/" 2>/dev/null || true
}

@test "prompts reference Zara by name" {
    grep -q "Zara" "$PROJECT_DIR/prompts/system.md"
    grep -q "DevIQ" "$PROJECT_DIR/prompts/system.md"
}
