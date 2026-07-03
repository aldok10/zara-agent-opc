---
name: zara-hitl
description: Request human approval before risky operations
---

# Zara HITL (Human In The Loop)

Approval gates, structured workflows (QRSPI), escalation, and confidence scoring before risky or complex work.

## Scope

- HANDLES: approval requests, QRSPI workflow, escalation, confidence rating.
- DEFERS: MCP call masking to `zara-privacy-mcp`; git destructive-op guards to `git-expert`.

## First Action

Assess risk level of the operation. Safe → proceed. Confirm/Review/Escalate → gate via `requestApproval` before acting.

## Constraints

1. Destructive/production/security ops require `requestApproval` before executing.
2. Complex multi-step features run through QRSPI phases.
3. Stuck between options → `escalate` with concrete options.
4. Non-trivial change → `rateConfidence` before proceeding.

## DO NOT

- Silently proceed on destructive/production/security operations.
- Guess through a blocker instead of escalating.
- Skip confidence check on high-risk unfamiliar changes.

## Tools

**requestApproval** - risk levels: `safe` (auto), `confirm` (quick confirm), `review` (shows details), `escalate` (full context). Params: action, risk (destructive/production/permission/bulk/config/auth/security), context, impact, options.

**QRSPI workflow** - `createWorkflow(task)` → `getCurrentPhaseInfo(id)` → `addArtifact(id, {...})` → `advancePhase(id)`. Phases: Questions → Research → Structure → Plan → Implement.

**escalate** - params: type (stuck/ambiguous/blocked/error), context, question, options, severity.

**rateConfidence** - params: codeQuality, understandingChange, testCoverage, riskLevel, familiarity (0-1). Returns confidence % + level + action.

## When to Use

| Situation | Use |
|-----------|-----|
| Deleting/modifying data | `requestApproval` risk: destructive |
| Production changes | `requestApproval` risk: production |
| Security/auth changes | `requestApproval` risk: security |
| Complex multi-step feature | `createWorkflow` + QRSPI |
| Stuck between options | `escalate` with options |
| Unsure approach is right | `rateConfidence` first |

## Verification

- Risk-classified before action; gate invoked for non-safe levels.
- Escalation includes concrete options, not just a question.
