#!/usr/bin/env bats
# =============================================================================
# Prompt File Tests for Zara Agent
# =============================================================================
# Verifies the canonical prompt structure exists and is valid.
# Canonical instructions live in .opencode/, with prompts/ holding philosophy
# and sub-agent reference prompts.
# =============================================================================

setup() {
    PROJECT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
}

# =============================================================================
# Canonical Instruction Tests
# =============================================================================

@test "canonical system.md exists and is non-empty" {
    [ -f "$PROJECT_DIR/.opencode/instructions/system.md" ]
    [ -s "$PROJECT_DIR/.opencode/instructions/system.md" ]
}

@test "philosophy.md exists and is non-empty" {
    [ -f "$PROJECT_DIR/prompts/philosophy.md" ]
    [ -s "$PROJECT_DIR/prompts/philosophy.md" ]
}

@test "prompts/system.md redirect exists" {
    [ -f "$PROJECT_DIR/prompts/system.md" ]
    [ -s "$PROJECT_DIR/prompts/system.md" ]
}

# =============================================================================
# Primary Agent Definition Tests
# =============================================================================

@test "zara agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/zara.md" ]
}

@test "plan agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/plan.md" ]
}

# =============================================================================
# Sub-Agent Definition Tests (.opencode/agent — runtime source)
# =============================================================================

@test "architect agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/architect.md" ]
}

@test "code-reviewer agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/code-reviewer.md" ]
}

@test "testing-lead agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/testing-lead.md" ]
}

@test "security-reviewer agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/security-reviewer.md" ]
}

@test "delivery-lead agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/delivery-lead.md" ]
}

@test "swarm agent definition exists" {
    [ -f "$PROJECT_DIR/.opencode/agent/swarm.md" ]
}

# =============================================================================
# Sub-Agent Reference Prompt Tests (prompts/sub-agents — reference docs)
# =============================================================================

@test "architect sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/architect.md" ]
}

@test "code-reviewer sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/code-reviewer.md" ]
}

@test "testing-lead sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/testing-lead.md" ]
}

@test "practices-lead sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/practices-lead.md" ]
}

@test "ddd-specialist sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/ddd-specialist.md" ]
}

@test "security-reviewer sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/security-reviewer.md" ]
}

@test "delivery-lead sub-agent reference exists" {
    [ -f "$PROJECT_DIR/prompts/sub-agents/delivery-lead.md" ]
}

# =============================================================================
# Structure Tests
# =============================================================================

@test "canonical system.md references Connection DNA" {
    grep -q "Connection DNA" "$PROJECT_DIR/.opencode/instructions/system.md"
}

@test "philosophy.md contains priority stack" {
    grep -q "Priority Stack" "$PROJECT_DIR/prompts/philosophy.md"
}

@test "prompts/system.md redirects to canonical" {
    grep -q ".opencode/instructions/system.md" "$PROJECT_DIR/prompts/system.md"
}

# =============================================================================
# Quality Checks
# =============================================================================

@test "no deprecated personal paths in prompts" {
    ! grep -r "/Users/" "$PROJECT_DIR/prompts/" 2>/dev/null
}

@test "no hardcoded API keys in prompts" {
    ! grep -rE 'sk-[a-zA-Z0-9]{20,}' "$PROJECT_DIR/prompts/" 2>/dev/null
}

@test "agent definitions reference Zara by name" {
    grep -q "Zara" "$PROJECT_DIR/.opencode/agent/zara.md"
}
