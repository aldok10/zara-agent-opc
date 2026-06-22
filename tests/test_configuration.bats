#!/usr/bin/env bats
# =============================================================================
# Configuration File Tests for Zara Agent
# =============================================================================

setup() {
    PROJECT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
}

# =============================================================================
# File Existence Tests
# =============================================================================

@test ".env.example exists" {
    [ -f "$PROJECT_DIR/.env.example" ]
}

@test "config.yaml exists" {
    [ -f "$PROJECT_DIR/config.yaml" ]
}

@test ".gitignore exists" {
    [ -f "$PROJECT_DIR/.gitignore" ]
}

# =============================================================================
# YAML Configuration Tests
# =============================================================================

@test "config.yaml has agent section" {
    grep -q "^agent:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has sub_agents section" {
    grep -q "^sub_agents:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has knowledge section" {
    grep -q "^knowledge:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has memory section" {
    grep -q "^memory:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has llm section" {
    grep -q "^llm:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has tools section" {
    grep -q "^tools:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has skills section" {
    grep -q "^skills:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has security section" {
    grep -q "^security:" "$PROJECT_DIR/config.yaml"
}

@test "config.yaml has quality_gates section" {
    grep -q "^quality_gates:" "$PROJECT_DIR/config.yaml"
}

@test "opencode.json defines all 9 agents" {
    for key in zara plan architect code-reviewer testing-lead security-reviewer delivery-lead swarm loop-engineer; do
        grep -q "\"$key\":" "$PROJECT_DIR/opencode.json"
    done
}

@test "opencode.json has Zara as default agent" {
    grep -q '"default_agent": "zara"' "$PROJECT_DIR/opencode.json"
}

# =============================================================================
# Environment Variable Tests
# =============================================================================

@test ".env.example has ZARA_HOME" {
    grep -q "ZARA_HOME" "$PROJECT_DIR/.env.example"
}

@test ".env.example has CONTEXT7_API_KEY" {
    grep -q "CONTEXT7_API_KEY" "$PROJECT_DIR/.env.example"
}

@test ".env.example has ZARA_DEFAULT_MODEL" {
    grep -q "ZARA_DEFAULT_MODEL" "$PROJECT_DIR/.env.example"
}

@test ".env.example has feature toggles" {
    grep -q "ZARA_ENABLE_MEMORY" "$PROJECT_DIR/.env.example"
    grep -q "ZARA_ENABLE_HIVEMIND" "$PROJECT_DIR/.env.example"
    grep -q "ZARA_ENABLE_SWARM" "$PROJECT_DIR/.env.example"
}

@test ".env.example has security settings" {
    grep -q "ZARA_ALLOWED_COMMANDS" "$PROJECT_DIR/.env.example"
    grep -q "ZARA_BLOCKED_COMMANDS" "$PROJECT_DIR/.env.example"
}

# =============================================================================
# Security Configuration Tests
# =============================================================================

@test "no secrets in .env.example" {
    # Should show placeholder, not real values
    ! grep -q "ctx7sk-" "$PROJECT_DIR/.env.example"
}

@test "no personal paths in config.yaml" {
    ! grep -q "/Users/" "$PROJECT_DIR/config.yaml"
}

@test ".gitignore excludes .env files" {
    grep -q "^\.env" "$PROJECT_DIR/.gitignore"
}

@test ".gitignore excludes node_modules" {
    grep -q "node_modules" "$PROJECT_DIR/.gitignore"
}

@test ".gitignore excludes memory data" {
    grep -q "journal.jsonl" "$PROJECT_DIR/.gitignore"
    grep -q "skills-index.json" "$PROJECT_DIR/.gitignore"
}
