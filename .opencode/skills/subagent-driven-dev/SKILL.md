---
name: subagent-driven-dev
description: Use when executing implementation plans with independent tasks in the current session. Coordinates fresh subagents per task with mandatory review gates.
trigger: implementation plan execution, multi-task dispatch, parallel workstream coordination
---

# Subagent-Driven Development

Core principle: **Fresh subagent per task + task review + final broad review.**

Continuous execution: Do NOT pause between tasks. Execute all tasks sequentially without asking "should I continue?" Only stop when BLOCKED with no resolution path.

## Process Flow

### 1. Plan Intake

- Read the implementation plan
- Create a progress ledger file (`.tasks/progress.md`) tracking: task ID, status, assignee model, verdict
- Create todo items for each task
- The ledger survives context compaction — always re-read it before dispatching

### 2. Per-Task Execution Loop

For each task in order:

**A. Prepare task brief**
- Write a task brief file (`.tasks/task-{id}.md`) containing: objective, exact files to touch, constraints, acceptance criteria
- Never paste the full plan into a subagent prompt — only the relevant task brief

**B. Dispatch implementer subagent**
- Fresh context (no session history)
- ONE task, clear scope, exact files
- Implementer must: implement, test, commit, write a report file (`.tasks/report-{id}.md`)

**C. Review the output**
Two verdicts required, both must pass:

| Verdict | Question | Criteria |
|---------|----------|----------|
| Spec compliance | Did it build what was asked? | Matches acceptance criteria, no missing requirements |
| Code quality | Is it well-built? | Clean, tested, no smells, follows project conventions |

**D. Handle result**
- **PASS/PASS** → Mark complete in ledger, move to next task
- **Any FAIL** → Write feedback, re-dispatch with fixes. Max 2 retries, then escalate.

### 3. Final Review

After all tasks complete:
- Dispatch a final code reviewer subagent across ALL changed files
- Focus: integration coherence, cross-task consistency, missed edge cases
- Fix any Critical/Important issues before finishing

### 4. Finish

- Use `finishing-branch` skill (or equivalent branch finalization)
- Update ledger with final status

## Handling Statuses

| Status | Action |
|--------|--------|
| DONE | Review immediately |
| NEEDS_CONTEXT | Provide missing context in task brief, re-dispatch |
| BLOCKED | Assess: need more context? bigger model? break into pieces? plan itself wrong? |

For BLOCKED: try (in order) — provide context → use more capable model → decompose task → revise plan. If all fail, stop and report.

## File Handoffs

Never paste artifacts into dispatch prompts. Use files:

- **Input**: `.tasks/task-{id}.md` (task brief)
- **Output**: `.tasks/report-{id}.md` (implementer's report)
- **Ledger**: `.tasks/progress.md` (overall tracking)

This keeps subagent context clean and survives compaction.

## Model Selection

| Task type | Model tier |
|-----------|-----------|
| Mechanical (clear spec, 1-2 files, no ambiguity) | Cheapest available |
| Integration (multiple files, needs cross-file awareness) | Standard |
| Architecture decisions, final review | Most capable |

## Constructing Reviewer Prompts

- Do NOT add open-ended directives — keep scope tight
- Do NOT ask reviewer to re-run tests the implementer already ran
- Do NOT pre-judge findings (never "ignore X" or "don't flag Y")
- Include global constraints from the plan verbatim
- Provide the diff (use `git diff BASE..HEAD` output as context)
- Dispatch prompt describes ONE task, not session history
- Fix Critical and Important findings. Note Minor in ledger for final review.

## Durable Progress

Track in ledger file, not just todos:
- Ledger at `.tasks/progress.md` is the source of truth
- Tasks marked complete are DONE — never re-dispatch
- When task review passes, append: `Task N: complete (commits abc1234..def5678, review clean)`
- After context compaction, trust ledger + `git log` over memory

## Anti-Patterns (NEVER Do These)

- NEVER skip task review (even if "it looks fine")
- NEVER proceed with unfixed Critical/Important issues
- NEVER dispatch parallel implementers to the same codebase (merge conflicts)
- NEVER paste the whole plan into a subagent dispatch (context bloat)
- NEVER re-dispatch a task already marked complete in the ledger
- NEVER ask "should I continue?" between tasks (continuous execution)
- NEVER let self-review replace actual review (reviewer must be separate subagent)
- NEVER tell reviewer what not to flag (let them find what they find)
- NEVER move to next task with open Critical/Important issues
- NEVER claim "done" without running verification commands

## Progress Ledger Format

```markdown
# Progress Ledger

| # | Task | Status | Model | Spec | Quality | Commits | Notes |
|---|------|--------|-------|------|---------|---------|-------|
| 1 | Auth middleware | DONE | std | PASS | PASS | abc..def | |
| 2 | User endpoints | IN_PROGRESS | std | - | - | | |
| 3 | DB migrations | PENDING | cheap | - | - | | |
```

Update after every task completion or status change.

## Integration

**Required workflow skills:**
- `git-worktrees` — isolated workspace
- `writing-plans` — creates the plan this skill executes
- `code-review` — final whole-branch review
- `finishing-branch` — complete after all tasks

**Subagents should use:**
- `tdd` — test-driven implementation
- `verification-before-completion` — before reporting DONE

**Alternative:**
- `executing-plans` — for inline execution without subagents

## Related Skills

| When | Load |
|------|------|
| Implementing each task | `tdd` |
| Before claiming task done | `verification-before-completion` |
| Final code review | `code-review` |
| All tasks complete | `finishing-branch` |
