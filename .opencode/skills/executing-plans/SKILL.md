---
name: executing-plans
description: Batch-execute implementation plans with review checkpoints
trigger: plan execution inline, batch implementation, no subagent execution
---

# Executing Plans

Execute a plan directly in the current session, task by task. Use when subagents unavailable or user prefers inline. If subagents available, prefer `subagent-driven-dev` (higher quality via isolated contexts).

## Scope

- HANDLES: inline task execution, review checkpoints, blocker escalation.
- DEFERS: plan creation to `writing-plans`; per-task test discipline to `tdd`; completion to `verification-before-completion`; integration to `finishing-branch`.

## First Action

Read the plan, review critically for gaps/ambiguities. Concerns → raise before starting. Clean → create todos, proceed.

## Constraints

1. Execute tasks in order, continuously. Do NOT pause between tasks.
2. Each task follows TDD (load `tdd`): failing test → watch fail → minimal code → watch pass → commit.
3. Run verification as specified in the plan per task.
4. Review checkpoint every 3-5 tasks (or milestone): all tests passing? drift? integration issues? Fix before continuing.
5. After all tasks: full suite, then `finishing-branch`.

## DO NOT

- NEVER skip test steps ("I'll test after").
- NEVER proceed past failing verification.
- NEVER modify the plan silently (discuss first).
- NEVER mix refactoring with feature implementation.
- NEVER start on main/master without explicit consent.
- NEVER pause between tasks without a blocker.
- NEVER claim "done" without verification commands.
- NEVER re-dispatch/redo a task already marked complete.

## Stop and Ask When

- Verification fails >2 attempts.
- Plan step ambiguous (can't determine what to build).
- Missing dependency blocks progress.
- Architecture question the plan doesn't address.

Ask for clarification. Don't guess through blockers.

## Verification

- Each task's verification passes before marking complete.
- Full suite passes before `finishing-branch`.
- For larger diffs, dispatch `task(code-reviewer)`.

## Related Skills

| When | Load |
|------|------|
| Creates the plan | `writing-plans` |
| Implementing each task | `tdd` |
| Before claiming task done | `verification-before-completion` |
| All tasks complete | `finishing-branch` |
