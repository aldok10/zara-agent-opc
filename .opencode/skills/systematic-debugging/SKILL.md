---
name: systematic-debugging
description: Structured debugging before proposing fixes
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

NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Guessing is not debugging.

## Scope

- HANDLES: root cause investigation, pattern analysis, hypothesis testing, fix implementation.
- DEFERS: regression test to `tdd`; post-fix review to `code-review`.

## First Action

Read the error message completely: every word, line number, stack frame. Do not skip.

## Constraints

1. Do not propose/attempt/implement any fix until traced to origin.
2. One hypothesis at a time, test with the smallest possible change, one variable.
3. Hypothesis refuted? Discard entirely, form a new one. Never stack fixes.
4. Create a failing test before implementing the fix.
5. Fix the root cause, not the symptom.
6. After 3 failed attempts: STOP, question the architecture, escalate to user.

## DO NOT

- NEVER propose a fix without completing Phase 1-3.
- NEVER stack multiple changes in one fix.
- NEVER guess the root cause without evidence.
- NEVER skip reproducing the bug consistently.
- NEVER continue after 3 failed attempts without escalating.
- NEVER assume you understand without tracing data flow.
- NEVER implement a fix without a failing test first.

## Workflow

1. Root cause - read errors, reproduce consistently, `git diff`/`git log -10`, gather evidence at boundaries, trace data flow backward. Success: can explain WHERE bad state originates and WHY.
2. Pattern analysis - find working examples in the same codebase, compare completely (not skim), identify differences, understand dependencies. Success: can articulate working vs broken difference.
3. Hypothesis - form single evidence-grounded hypothesis, test smallest change, observe, refuted → new hypothesis. Success: one hypothesis explains all symptoms.
4. Implementation - failing test first, single root-cause fix, verify (test + related + side effects). 3+ failures → STOP.

## Red Flags - STOP

| Thought | Reality |
|---------|---------|
| "Quick fix for now" | Don't understand root cause |
| "Just try changing X" | Guessing, not debugging |
| "Add multiple changes" | Won't know which worked |
| "It's probably X" | Probably ≠ evidence |
| "One more fix" after 2+ fails | STOP, reassess from scratch |
| "The issue is simple" | Simple issues have root causes too |
| "Emergency, no time" | Systematic is faster than guess-and-check |
| "I've seen this before" | Confirm with evidence, memory is unreliable |

## Verification

- Can state root cause in one sentence before fixing.
- Failing test written, then passes after fix.
- Related tests pass, no regressions.
- Root cause documented in commit/comment.

## Related Skills

| When | Load |
|------|------|
| Writing regression test | `tdd` |
| Code review after fix | `code-review` |

## AI-Era Context

Most code in 2026 is AI-generated, changing debugging dynamics:
- AI-generated bugs look syntactically correct but have subtle logic errors (off-by-one, wrong boundary conditions, missing edge cases)
- AI-generated code passes superficial review - deeper inspection needed at behavior boundaries
- Use AI as debugging partner: hypothesis generation, log analysis, stack trace interpretation
- Debugging AI systems themselves: non-deterministic outputs, prompt sensitivity, model version drift, hallucination detection
- Structured debugging is MORE critical now - AI makes "try random things" tempting but counterproductive
- Reproduction is harder for AI-related bugs (non-deterministic, context-dependent, model-version-specific)

## Knowledge

- knowledge/four-phase-process.md
- knowledge/distributed-debugging.md
- knowledge/performance-debugging.md
- knowledge/language-debugging.md
- knowledge/cognitive-debugging.md
- knowledge/ai-assisted-debugging.md
- knowledge/references.md
