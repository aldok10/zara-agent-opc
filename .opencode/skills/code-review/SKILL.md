---
name: code-review
description: Use when requesting a code review, receiving review feedback, or handling review comments — workflow for giving and responding to reviews with technical rigor.
triggers:
  - code review
  - review my code
  - review feedback
  - handle review comments
  - request review
---

# Code Review Skill

## Requesting Code Review

### When to Request

- After completing a task in subagent-driven development
- After major features land
- Before merge to main/trunk

### How to Request

1. Get the diff range:
   ```bash
   BASE_SHA=$(git merge-base HEAD main)
   HEAD_SHA=$(git rev-parse HEAD)
   ```

2. Dispatch `@lens` subagent with:
   - Description of what was built
   - Reference to requirements/plan (if exists)
   - Diff range: `BASE_SHA..HEAD_SHA`
   - Any known tradeoffs or shortcuts taken

### Acting on Feedback

| Severity | Action |
|----------|--------|
| Critical | Fix immediately before any other work |
| Important | Fix before proceeding to next task |
| Minor | Note for later, batch with next change |
| Disagree | Push back with technical reasoning |

Push back when: reviewer lacks context, suggestion breaks existing behavior, violates YAGNI, or is technically incorrect. Always provide reasoning.

## Receiving Code Review

### Core Principle

Verify before implementing. Technical correctness over social comfort.

### Response Pattern

```
READ complete feedback
  → UNDERSTAND (restate in your own words)
  → VERIFY against actual codebase
  → EVALUATE (is it technically sound?)
  → RESPOND (technical ack or reasoned pushback)
  → IMPLEMENT one fix at a time
```

### Forbidden

- "You're absolutely right!"
- "Great point!"
- Any sycophantic acknowledgment
- Implementing changes before verifying they're correct
- Batch-implementing without testing each fix

### Handling Unclear Feedback

STOP. Ask clarification on ALL unclear items before implementing any of them. Do not guess intent.

Example: "Item 3 and 5 are unclear. For item 3, do you mean X or Y? For item 5, can you show the pattern you're suggesting?"

### YAGNI Check

When reviewer suggests "implementing properly" or "adding for completeness":

1. Grep for actual usage of the thing in question
2. If unused or single-use: "Not called anywhere else. Remove? (YAGNI)"
3. If genuinely needed: implement

### When to Push Back

- Change breaks existing functionality (show the test/caller)
- Reviewer lacks context about a constraint or decision
- Suggestion violates YAGNI (prove with grep)
- Technically incorrect (cite docs/spec/behavior)
- Conflicts with user's explicit decisions

Format: State the disagreement, provide evidence, propose alternative if needed.

### Implementation Order

1. Blocking issues (breaks build/tests)
2. Simple fixes (naming, formatting, small logic)
3. Complex fixes (refactoring, architecture)

Test after each individual fix. Do not batch.

### Verification Before Implementation

For every review comment:

```
1. Read the suggestion completely
2. Find the relevant code in the codebase
3. Check: Does this change make technical sense HERE?
4. Check: Does this break anything else?
5. Only then: implement or push back
```

Never implement a suggestion you don't understand. Never implement without checking the surrounding code first.

## Related Knowledge (load on demand)

- `knowledge_search("code smell")` — detecting quality issues
- `knowledge_load(section: "code-smells")` — full smell catalog for systematic review
- `knowledge_load(section: "principles")` — SOLID, DRY, YAGNI for design feedback
- `knowledge_load(section: "design-patterns")` — when suggesting refactoring alternatives

## Related Skills

| When | Load |
|------|------|
| Test failures found | `tdd` |
| Bug needs investigation | `systematic-debugging` |
| Review done, ready to merge | `finishing-branch` |
