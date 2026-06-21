#!/usr/bin/env bats
# =============================================================================
# Repository Structure Tests for Zara Agent
# =============================================================================

setup() {
    PROJECT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
}

# =============================================================================
# Required Directory Tests
# =============================================================================

@test "docs directory exists" {
    [ -d "$PROJECT_DIR/docs" ]
}

@test "examples directory exists" {
    [ -d "$PROJECT_DIR/examples" ]
}

@test "prompts directory exists" {
    [ -d "$PROJECT_DIR/prompts" ]
}

@test "prompts/sub-agents directory exists" {
    [ -d "$PROJECT_DIR/prompts/sub-agents" ]
}

@test "workflows directory exists" {
    [ -d "$PROJECT_DIR/workflows" ]
}

@test "tools directory exists" {
    [ -d "$PROJECT_DIR/tools" ]
}

@test "scripts directory exists" {
    [ -d "$PROJECT_DIR/scripts" ]
}

@test "tests directory exists" {
    [ -d "$PROJECT_DIR/tests" ]
}

@test ".github directory exists" {
    [ -d "$PROJECT_DIR/.github" ]
}

@test ".github/ISSUE_TEMPLATE directory exists" {
    [ -d "$PROJECT_DIR/.github/ISSUE_TEMPLATE" ]
}

@test ".github/workflows directory exists" {
    [ -d "$PROJECT_DIR/.github/workflows" ]
}

@test "knowledge directory exists" {
    [ -d "$PROJECT_DIR/knowledge" ]
}

# =============================================================================
# Required Root File Tests
# =============================================================================

@test "README.md exists" {
    [ -f "$PROJECT_DIR/README.md" ]
    [ -s "$PROJECT_DIR/README.md" ]
}

@test "LICENSE exists" {
    [ -f "$PROJECT_DIR/LICENSE" ]
    [ -s "$PROJECT_DIR/LICENSE" ]
}

@test "CONTRIBUTING.md exists" {
    [ -f "$PROJECT_DIR/CONTRIBUTING.md" ]
    [ -s "$PROJECT_DIR/CONTRIBUTING.md" ]
}

@test "CODE_OF_CONDUCT.md exists" {
    [ -f "$PROJECT_DIR/CODE_OF_CONDUCT.md" ]
    [ -s "$PROJECT_DIR/CODE_OF_CONDUCT.md" ]
}

@test "SECURITY.md exists" {
    [ -f "$PROJECT_DIR/SECURITY.md" ]
    [ -s "$PROJECT_DIR/SECURITY.md" ]
}

@test "CHANGELOG.md exists" {
    [ -f "$PROJECT_DIR/CHANGELOG.md" ]
    [ -s "$PROJECT_DIR/CHANGELOG.md" ]
}

@test "ROADMAP.md exists" {
    [ -f "$PROJECT_DIR/ROADMAP.md" ]
    [ -s "$PROJECT_DIR/ROADMAP.md" ]
}

# =============================================================================
# Required Documentation Tests
# =============================================================================

@test "installation.md exists" {
    [ -f "$PROJECT_DIR/docs/installation.md" ]
}

@test "configuration.md exists" {
    [ -f "$PROJECT_DIR/docs/configuration.md" ]
}

@test "architecture.md exists" {
    [ -f "$PROJECT_DIR/docs/architecture.md" ]
}

@test "tools-reference.md exists" {
    [ -f "$PROJECT_DIR/docs/tools-reference.md" ]
}

@test "prompts.md exists" {
    [ -f "$PROJECT_DIR/docs/prompts.md" ]
}

@test "workflows.md exists" {
    [ -f "$PROJECT_DIR/docs/workflows.md" ]
}

@test "faq.md exists" {
    [ -f "$PROJECT_DIR/docs/faq.md" ]
}

# =============================================================================
# Required GitHub Templates Tests
# =============================================================================

@test "bug_report.md template exists" {
    [ -f "$PROJECT_DIR/.github/ISSUE_TEMPLATE/bug_report.md" ]
}

@test "feature_request.md template exists" {
    [ -f "$PROJECT_DIR/.github/ISSUE_TEMPLATE/feature_request.md" ]
}

@test "question.md template exists" {
    [ -f "$PROJECT_DIR/.github/ISSUE_TEMPLATE/question.md" ]
}

@test "PULL_REQUEST_TEMPLATE.md exists" {
    [ -f "$PROJECT_DIR/.github/PULL_REQUEST_TEMPLATE.md" ]
}

@test "FUNDING.yml exists" {
    [ -f "$PROJECT_DIR/.github/FUNDING.yml" ]
}

# =============================================================================
# CI/CD Workflow Tests
# =============================================================================

@test "ci.yml workflow exists" {
    [ -f "$PROJECT_DIR/.github/workflows/ci.yml" ]
}

@test "security.yml workflow exists" {
    [ -f "$PROJECT_DIR/.github/workflows/security.yml" ]
}

@test "release.yml workflow exists" {
    [ -f "$PROJECT_DIR/.github/workflows/release.yml" ]
}

# =============================================================================
# Example Tests
# =============================================================================

@test "basic examples exist" {
    [ -f "$PROJECT_DIR/examples/basic/README.md" ]
}

@test "coding examples exist" {
    [ -f "$PROJECT_DIR/examples/coding/README.md" ]
}

@test "devops examples exist" {
    [ -f "$PROJECT_DIR/examples/devops/README.md" ]
}

@test "research examples exist" {
    [ -f "$PROJECT_DIR/examples/research/README.md" ]
}

@test "automation examples exist" {
    [ -f "$PROJECT_DIR/examples/automation/README.md" ]
}

# =============================================================================
# Script Tests
# =============================================================================

@test "install.sh exists and is executable" {
    [ -x "$PROJECT_DIR/scripts/install.sh" ]
}

@test "test.sh exists and is executable" {
    [ -x "$PROJECT_DIR/scripts/test.sh" ]
}

@test "validate-config.sh exists and is executable" {
    [ -x "$PROJECT_DIR/scripts/validate-config.sh" ]
}

@test "setup-knowledge.sh exists and is executable" {
    [ -x "$PROJECT_DIR/scripts/setup-knowledge.sh" ]
}

@test "zara.sh CLI tool exists and is executable" {
    [ -x "$PROJECT_DIR/tools/zara.sh" ]
}
