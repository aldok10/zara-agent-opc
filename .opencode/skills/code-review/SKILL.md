---
name: code-review
description: Code review workflow with technical rigor
triggers:
  - code review
  - review my code
  - review feedback
  - handle review comments
  - request review
---

# Code Review

Give and respond to reviews with technical rigor. Verify before implementing. Technical correctness over social comfort.

## Scope

- HANDLES: requesting review, acting on feedback, receiving/verifying feedback, pushback.
- DEFERS: test failures to `tdd`; bug investigation to `systematic-debugging`; merge to `finishing-branch`.

## First Action

For requesting: get diff range. For receiving: read complete feedback, restate it before touching code.

```bash
BASE_SHA=$(git merge-base HEAD main); HEAD_SHA=$(git rev-parse HEAD)
```

## Constraints

1. Verify every suggestion against the actual codebase before implementing.
2. Implement one fix at a time, test after each. Never batch.
3. Unclear feedback: STOP, ask clarification on ALL unclear items before implementing any.
4. YAGNI check: reviewer says "add for completeness"? Grep usage. Unused/single-use = push back.
5. Implementation order: blocking (build/tests) → simple → complex.
6. Dispatch review via `@lens` with: what was built, requirements ref, diff range, known tradeoffs.

## DO NOT

- NEVER implement a suggestion without verifying it first.
- NEVER batch multiple fixes without testing each.
- NEVER claim "done" after review without running verification.
- NEVER accept feedback you don't understand.
- NEVER skip the YAGNI check.
- NEVER push back without evidence.
- NEVER implement without reading surrounding code.
- No sycophancy: "You're absolutely right!", "Great point!".

## Response Pattern (receiving)

READ complete → UNDERSTAND (restate) → VERIFY against codebase → EVALUATE (technically sound?) → RESPOND (ack or reasoned pushback) → IMPLEMENT one at a time.

## Acting on Feedback

| Severity | Action |
|----------|--------|
| Critical | Fix immediately before other work |
| Important | Fix before next task |
| Minor | Note, batch with next change |
| Disagree | Push back with technical reasoning |

## When to Push Back

Change breaks existing behavior (show test/caller) · reviewer lacks context · violates YAGNI (prove with grep) · technically incorrect (cite docs/spec) · conflicts with user's explicit decisions. Format: state disagreement, provide evidence, propose alternative.

## Verification

- Each fix tested individually before the next.
- Verification commands run before claiming review done.
- Pushback backed by evidence (test, grep, doc).

## Related Skills

| When | Load |
|------|------|
| Test failures found | `tdd` |
| Bug needs investigation | `systematic-debugging` |
| Ready to merge | `finishing-branch` |

## Knowledge (load on demand)

- `Orchestrator_memory(action:"recall", query:query: "code smell catalog")` · `knowledge_index(section: "code-smells", layer:"knowledge")`
- `Orchestrator_memory(action:"recall", query:query: "SOLID DRY YAGNI principles")` · `knowledge_index(section: "design-patterns", layer:"knowledge")`
