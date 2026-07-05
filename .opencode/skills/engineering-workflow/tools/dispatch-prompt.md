---
type: tool
title: "Subagent Dispatch Prompt Template"
---

# Subagent Dispatch Prompt Template

You are dispatching a task to a specialized subagent. Structure the dispatch for maximum clarity and minimum ambiguity.

## Dispatch Format

```
Task: [One sentence describing what the subagent must accomplish]

Context:
- [Key fact 1 -- file paths, current behavior, relevant constraints]
- [Key fact 2]
- [Key fact 3]
(Keep under 1000 tokens total. Include only what's needed to complete the task.)

Acceptance Criteria:
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

Constraints:
- Budget: [max steps/calls]
- Scope: [what NOT to touch]
- Style: [conventions to follow]

Return Format:
- [What the subagent should return -- diff, summary, file list, etc.]
- Must end with: EXIT: COMPLETED|BLOCKED|BUDGET_EXHAUSTED|ESCALATED
- Must include: Confidence: high|med|low - [basis]
```

## Agent Selection Guide

| Agent | Use When |
|-------|----------|
| @scout | Exploring unfamiliar codebase, gathering info |
| @atlas | Architecture questions, system mapping |
| @lens | Code review, quality assessment |
| @shield | Security review, vulnerability analysis |
| @probe | Writing/running tests, verification |
| @pulse | Deployment, shipping, release tasks |
| @forge | Implementation, building features |
| @refiner | Validating complex outputs, quality gates |
| @hive | 3+ parallel independent tasks |
| @rhythm | Iterative loops, harness-based work |

## Anti-Patterns

- Sending full file contents instead of paths (bloats context)
- Vague acceptance criteria ("make it good")
- Missing constraints (agent goes out of scope)
- No return format (agent returns unstructured text)
- Dispatching when inline would be faster (single grep, one-line edit)

## Validation

Before dispatching, verify:
1. Could I do this faster inline? (If yes, don't dispatch)
2. Is the task self-contained? (If not, break it down further)
3. Does the subagent have enough context without reading the full conversation?
4. Are acceptance criteria testable by the receiving agent?
