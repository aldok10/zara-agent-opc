# Code Review

Give and act on reviews with technical rigor. Verify before implementing. Technical correctness over social comfort.

## Response Pattern (receiving)

READ complete → UNDERSTAND (restate before touching code) → VERIFY against codebase → EVALUATE (technically sound?) → RESPOND (ack or reasoned pushback) → IMPLEMENT one at a time.

## First Action

For requesting: get diff range. For receiving: read complete feedback, restate it before touching code.

```bash
BASE_SHA=$(git merge-base HEAD main); HEAD_SHA=$(git rev-parse HEAD)
```

## Acting on Feedback

| Severity | Action |
|----------|--------|
| Critical | Fix immediately before other work |
| Important | Fix before next task |
| Minor | Note, batch with next change |
| Disagree | Push back with technical reasoning |

Implementation order: blocking (build/tests) → simple → complex. One fix at a time, test after each. Never batch.

## Reviewing AI Output

AI code looks plausible and reads clean -- that is the trap. Check what tests actually ASSERT (tautological? restate the code?), missed edge cases (null/empty/boundary), invented APIs, and silent scope creep. Higher scrutiny than human output, not less.

## Code Smells to Flag

Long functions, deep nesting, duplicated logic (3 is fine, extract at 4), unclear names, primitive obsession, feature envy, shotgun surgery, speculative generality (YAGNI), swallowed exceptions, magic numbers.

## When to Push Back

Change breaks existing behavior (show test/caller) · reviewer lacks context · violates YAGNI (prove with grep) · technically incorrect (cite docs/spec) · conflicts with user's explicit decisions. Format: state disagreement, provide evidence, propose alternative.

## DO NOT

- NEVER implement a suggestion without verifying it against the codebase.
- NEVER batch multiple fixes without testing each.
- NEVER claim "done" after review without running verification.
- NEVER accept feedback you don't understand -- STOP, ask on ALL unclear items first.
- NEVER skip the YAGNI check ("add for completeness"? grep usage; unused/single-use = push back).
- NEVER push back without evidence.
- No sycophancy: "You're absolutely right!", "Great point!".
