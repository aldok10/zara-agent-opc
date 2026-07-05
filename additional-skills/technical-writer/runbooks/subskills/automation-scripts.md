---
type: subskill
title: "Automation Scripts Documentation"
---

# Automation Scripts Documentation

## Core Concepts
- Automation script docs describe operational scripts: what they do, how to run them, what to expect
- Scripts are code but consumed by operators - documentation bridges the gap
- Must cover: purpose, prerequisites, parameters, expected output, error handling, rollback
- Scripts in runbooks should be tested, version-controlled, and reviewed like production code
- Idempotency: document whether a script is safe to re-run or has side effects

## Key Practices
- Include a one-line summary at the top: what this script does and when to use it
- Document all parameters with types, defaults, and valid ranges
- Show example invocations for common scenarios with expected output
- List preconditions: what state must be true before running (service stopped, backup taken)
- Document failure modes: what happens if the script is interrupted or fails mid-execution

## Common Mistakes
- Scripts without documentation that only the author can run correctly
- Missing rollback instructions when automation makes destructive changes
- Documenting the script once and not updating when behavior changes

## When to Apply
- Writing operational automation for database migrations, deployments, or maintenance
- Creating self-service tooling for teams to perform common operational tasks
- Documenting disaster recovery procedures that involve scripted steps
