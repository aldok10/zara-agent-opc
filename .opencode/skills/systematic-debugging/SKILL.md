---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior — before proposing fixes
triggers:
  - bug
  - test failure
  - unexpected behavior
  - error
  - debugging
  - "why is this failing"
  - "not working"
---

# Systematic Debugging

## The Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Do not propose, attempt, or implement any fix until you have traced the problem to its origin. Guessing is not debugging.

---

## Phase 1 — Root Cause Investigation

1. **Read error messages carefully** — every word, every line number, every stack frame. Do not skip.
2. **Reproduce consistently** — if you can't trigger it reliably, you don't understand it yet.
3. **Check recent changes** — `git diff`, `git log --oneline -10`. What changed?
4. **Gather evidence at component boundaries** — log inputs/outputs at each layer.
5. **Trace data flow backward** — start from the symptom, walk back through each transformation.

Success criteria: You can explain WHERE the bad state originates and WHY.

---

## Phase 2 — Pattern Analysis

1. **Find working examples** in the same codebase — similar features that work correctly.
2. **Compare against references** — read completely, don't skim. Character-by-character if needed.
3. **Identify differences** — what's different between working and broken?
4. **Understand dependencies** — what does this code assume about its environment?

Success criteria: You can articulate the difference between working and broken behavior.

---

## Phase 3 — Hypothesis & Testing

1. **Form a single hypothesis**: "I think X happens because Y" — grounded in evidence from Phase 1-2.
2. **Test with the SMALLEST possible change** — one variable at a time.
3. **Observe result** — did it confirm or refute the hypothesis?
4. **Didn't work?** Discard that hypothesis entirely. Form a NEW one. Do not stack fixes.

Success criteria: A single hypothesis explains all observed symptoms.

---

## Phase 4 — Implementation

1. **Create a failing test case first** — proves the bug exists and will catch regressions.
2. **Implement a single fix** addressing the root cause — not the symptom.
3. **Verify the fix** — run the test, run related tests, check for side effects.
4. **If 3+ fixes have failed** → STOP. Question the architecture. Discuss with the user before attempting more.

Success criteria: Test passes, no regressions, fix addresses root cause not symptom.

---

## Anti-Patterns (NEVER Do These)

- NEVER propose a fix without completing Phase 1-3
- NEVER stack multiple changes in one fix
- NEVER guess the root cause without evidence
- NEVER skip reproducing the bug consistently
- NEVER continue after 3 failed attempts without escalating
- NEVER assume you understand the problem without tracing data flow
- NEVER implement a fix without creating a failing test first

---

## Red Flags — STOP Immediately

| If you catch yourself thinking... | Then... |
|---|---|
| "Quick fix for now" | You don't understand the root cause |
| "Just try changing X" | You're guessing, not debugging |
| "Add multiple changes at once" | You won't know which one worked |
| "It's probably X" | Probably ≠ evidence |
| Proposing solutions before tracing data flow | Go back to Phase 1 |
| "One more fix attempt" after 2+ failures | STOP. Reassess from scratch |

---

## Rationalization Table

| You tell yourself... | Reality |
|---|---|
| "The issue is simple" | Simple issues have root causes too. Find it. |
| "Emergency, no time for this" | Systematic is faster than guess-and-check. Always. |
| "I can see the problem" | Seeing symptoms ≠ understanding root cause |
| "I've seen this before" | Confirm with evidence. Memory is unreliable. |
| "The fix is obvious" | Obvious fixes that skip investigation create new bugs |

---

## Quick Reference

| Phase | Key Activities | Success Criteria |
|---|---|---|
| 1. Root Cause | Read errors, reproduce, git diff, trace data flow | Can explain where and why bad state originates |
| 2. Pattern Analysis | Find working examples, compare, identify differences | Can articulate difference between working and broken |
| 3. Hypothesis | Single hypothesis, smallest change, one variable | One hypothesis explains all symptoms |
| 4. Implementation | Failing test, single fix, verify | Test passes, no regressions, root cause addressed |

---

## Workflow Integration

- Before ANY fix attempt, confirm: "I have completed Phase 1-3."
- After each failed attempt, return to Phase 1 — do not iterate on a broken hypothesis.
- After 3 failed attempts, escalate to the user with your findings so far.
- Document root cause in commit message or code comment for future reference.

## Related Knowledge (load on demand)

- `knowledge_passage(query: "debugging antipattern root cause")` — when bug stems from structural issue
- `knowledge_index(section: "code-smells")` — when investigating code quality root causes
- `knowledge_index(section: "practices")` — for debugging/refactoring practices

## Related Skills

| When | Load |
|------|------|
| Writing regression test | `tdd` |
| Need code review after fix | `code-review` |
