#!/usr/bin/env bats
# =============================================================================
# Prompt File Tests for Zara Agent
# =============================================================================
# Verifies the canonical prompt structure exists and is valid.
# Canonical instructions live in .opencode/instructions/, agent prompts in
# .opencode/agent/, and engineering philosophy in prompts/.
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

# =============================================================================
# All 9 Agent Definition Tests (.opencode/agent — runtime source)
# =============================================================================

@test "All agent definitions exist in .opencode/agent/" {
    run ls "$PROJECT_DIR/.opencode/agent/"*.md
    [ "${#lines[@]}" -ge 9 ]
}

@test "zara agent definition exists and is non-empty" {
    [ -f "$PROJECT_DIR/.opencode/agent/zara.md" ]
    [ -s "$PROJECT_DIR/.opencode/agent/zara.md" ]
}

@test "sketch agent definition exists (JSON key: plan)" {
    [ -f "$PROJECT_DIR/.opencode/agent/sketch.md" ]
}

@test "atlas agent definition exists (JSON key: architect)" {
    [ -f "$PROJECT_DIR/.opencode/agent/atlas.md" ]
}

@test "lens agent definition exists (JSON key: code-reviewer)" {
    [ -f "$PROJECT_DIR/.opencode/agent/lens.md" ]
}

@test "probe agent definition exists (JSON key: testing-lead)" {
    [ -f "$PROJECT_DIR/.opencode/agent/probe.md" ]
}

@test "shield agent definition exists (JSON key: security-reviewer)" {
    [ -f "$PROJECT_DIR/.opencode/agent/shield.md" ]
}

@test "pulse agent definition exists (JSON key: delivery-lead)" {
    [ -f "$PROJECT_DIR/.opencode/agent/pulse.md" ]
}

@test "rhythm agent definition exists (JSON key: loop-engineer)" {
    [ -f "$PROJECT_DIR/.opencode/agent/rhythm.md" ]
}

@test "hive agent definition exists (JSON key: swarm)" {
    [ -f "$PROJECT_DIR/.opencode/agent/hive.md" ]
}

# =============================================================================
# opencode.json References Tests
# =============================================================================

@test "opencode.json references all 9 agent JSON keys" {
    for key in zara plan architect code-reviewer testing-lead security-reviewer delivery-lead swarm loop-engineer; do
        grep -q "\"$key\":" "$PROJECT_DIR/opencode.json"
    done
}

@test "opencode.json prompt paths match actual agent files" {
    grep -q "zara.md" "$PROJECT_DIR/opencode.json"
    grep -q "sketch.md" "$PROJECT_DIR/opencode.json"
    grep -q "atlas.md" "$PROJECT_DIR/opencode.json"
    grep -q "lens.md" "$PROJECT_DIR/opencode.json"
    grep -q "probe.md" "$PROJECT_DIR/opencode.json"
    grep -q "shield.md" "$PROJECT_DIR/opencode.json"
    grep -q "pulse.md" "$PROJECT_DIR/opencode.json"
    grep -q "rhythm.md" "$PROJECT_DIR/opencode.json"
    grep -q "hive.md" "$PROJECT_DIR/opencode.json"
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

# =============================================================================
# Quality Checks
# =============================================================================

@test "no deprecated personal paths in prompts" {
    ! grep -r "/Users/" "$PROJECT_DIR/.opencode/" 2>/dev/null
    ! grep -r "/Users/" "$PROJECT_DIR/prompts/" 2>/dev/null
}

@test "no hardcoded API keys in prompts" {
    ! grep -rE 'sk-[a-zA-Z0-9]{20,}' "$PROJECT_DIR/.opencode/" 2>/dev/null
    ! grep -rE 'sk-[a-zA-Z0-9]{20,}' "$PROJECT_DIR/prompts/" 2>/dev/null
}

@test "zara.md defines all 8 specialist @-mentions" {
    grep -q "@atlas" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@lens" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@shield" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@probe" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@pulse" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@rhythm" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@hive" "$PROJECT_DIR/.opencode/agent/zara.md"
    grep -q "@sketch" "$PROJECT_DIR/.opencode/agent/zara.md"
}

@test "all agent files are voice compliant (no em dashes)" {
    ! grep -l '—' "$PROJECT_DIR/.opencode/agent/"*.md
}
