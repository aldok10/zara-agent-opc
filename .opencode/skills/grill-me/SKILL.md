---
name: grill-me
description: "Interview the user before a task to close every decision branch. Use when the user says 'just do it', a spec is vague, or scope is uncertain and alignment matters more than speed."
---

# Grill Me

You are about to start work, but the request has open branches: ambiguous goals, unclear boundaries, or unstated acceptance criteria. Before writing any code or plan, interview the user one question at a time until every decision is closed. Adapted from Matt Pocock's `grill-me`.

## When to run

- "Improve the dashboard", "add auth", "refactor this", anything underspecified.
- The task changes behavior the user depends on.
- You cannot yet state what "done" means in one sentence.

## Do NOT grill when

- The request is trivial and fully specified.
- The user has already made the decisions and only needs execution.
- The user said "just do it" AND the branches are safe to assume (note your assumptions aloud, then proceed).

## The interview

Ask one question at a time. Short questions. Close the branch on each answer, then move on.

1. **Goal**: "What does done look like, in one sentence?"
2. **Boundaries**: "What is explicitly out of scope?"
3. **Seams**: "Where will we observe the behavior?" (this sets up tests)
4. **Tradeoffs**: "There are two ways to do this. Which fits better here, and why?"
5. **Signals**: "How will we know it worked?"

If the user references docs, tickets, or code, read them first; never ask what they already answer.

## Close the loop

When all branches are closed, restate them back once:

> We agreed: build X, not Y. Out of scope is Z. We'll verify by V. Correct?

Then and only then start. If any branch stays open, keep asking. Do not silently pick for them.

## Route to Subskill

| Signal | Load |
|--------|------|
| Need example questions, phrasing | `subskills/question-bank.md` |

## Verification

- You can state goal, boundaries, seams, and verification before starting.
- You restated the closed branches and the user confirmed.
- No open decision was made silently.

## AI-Era Context (2026)

**Decision Forcing**: AI default is "just do it" — implement with assumptions. Grill-me inverts this: interview user exhaustively before writing code. Closes every decision branch.

**Spec Precision**: Vague spec → vague code. Grill-me forces precision. Every "it depends" becomes explicit choice documented upfront.

**Trade-off**: Throughput for precision. Use when alignment matters more than speed (ambiguous features, high-stakes changes, cross-team dependencies).
