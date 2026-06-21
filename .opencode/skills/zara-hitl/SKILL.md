---
name: zara-hitl
description: Use when requesting human approval before risky operations, running QRSPI structured workflows, escalating to user when stuck or uncertain, or rating confidence before complex changes
---

# Skill: zara-hitl — Human In The Loop

## Context

Use this skill when you need to:
- Request human approval before risky operations
- Run structured workflows (QRSPI: Questions → Research → Structure → Plan → Implement)
- Escalate to the user when stuck or uncertain
- Rate confidence before proceeding with complex changes

## Available Tools

### Approval Gates

Before destructive or risky operations, request human approval:

```javascript
// Request approval for a risky operation
requestApproval({
  action: "DROP TABLE users",
  risk: "destructive",    // destructive, production, permission, bulk, config, auth, security
  context: "Removing deprecated users table - data has been migrated to profiles table",
  impact: "Production database — requires downtime window",
  options: [
    "Proceed with DROP TABLE",
    "Rename table instead (rollback option)",
    "Archive data first, then drop"
  ]
})
```

**Risk levels and their default approval requirements:**

| Risk | Level | Auto-Approve |
|------|-------|-------------|
| `safe` | Safe (0) | Yes |
| `confirm` | Confirm (1) | No — asks for quick confirm |
| `review` | Review (2) | No — shows details |
| `escalate` | Escalate (3) | No — full context needed |

### QRSPI Workflow

For complex tasks, run a structured workflow:

```javascript
// Create workflow for a complex task
const wf = createWorkflow("Implement auth middleware")

// Get current phase info
const phase = getCurrentPhaseInfo(wf.id)
// phase: { currentPhase: "questions", checklist: [...], artifacts: [] }

// Add artifacts (research findings, design docs, plans)
addArtifact(wf.id, { type: "research", content: "..." })

// Advance to next phase when ready
advancePhase(wf.id)
```

**Phases:**

1. **Questions** — What are we solving? What are constraints?
2. **Research** — Map codebase, patterns, dependencies
3. **Structure** — Break into verifiable steps
4. **Plan** — File paths, test cases, acceptance criteria
5. **Implement** — Execute with verification

### Human Escalation

When stuck, escalate with full context:

```javascript
escalate({
  type: "blocked",          // stuck, ambiguous, blocked, error
  context: "Three approaches found. Unsure which fits best.",
  question: "Should I use JWT, session tokens, or API keys?",
  options: [
    "JWT — stateless, no DB lookup",
    "Session tokens — revocable, stateful",
    "API keys — simple but no user context"
  ],
  severity: "medium"
})
```

### Confidence Scoring

```javascript
rateConfidence({
  codeQuality: 0.8,        // How clean is the approach?
  understandingChange: 0.7, // How well do I understand the change?
  testCoverage: 0.6,        // How tested is the area?
  riskLevel: 0.3,           // How risky? (low=0, high=1)
  familiarity: 0.9          // How familiar am I with this code?
})
// Returns: { confidence: 78, level: "medium", action: "review_first" }
```

## When to Use Each

| Situation | Use |
|-----------|-----|
| Deleting/modifying data | `requestApproval` with risk: "destructive" |
| Production changes | `requestApproval` with risk: "production" |
| Complex, multi-step features | `createWorkflow` + QRSPI phases |
| Stuck between options | `escalate` with options |
| Unsure if approach is right | `rateConfidence` before proceeding |
| Security/auth changes | `requestApproval` with risk: "security" |
