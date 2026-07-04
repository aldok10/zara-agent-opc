# Subagent Patterns

Fresh subagent per task + task review + final broad review. Execute all tasks sequentially, continuously. Only stop when BLOCKED with no path.

## Scope

- HANDLES: task dispatch, review gates, ledger tracking, model selection, blocked-status handling.
- DEFERS: plan creation to planning phase; inline execution to `execution.md`; final review to `code-review`; completion to `finishing-branch`.

## First Action

Read the plan, create `.tasks/progress.md` ledger (task ID, status, model, verdict). Re-read ledger before every dispatch (survives compaction).

## Constraints

1. Never paste the full plan into a subagent prompt: only the relevant task brief.
2. Each subagent: fresh context, ONE task, exact files, must implement/test/commit/report.
3. Two verdicts per task, both must PASS: spec compliance + code quality.
4. PASS/PASS → mark complete, next task. Any FAIL → feedback, re-dispatch. Max 2 retries then escalate.
5. Final review: separate reviewer subagent across ALL changed files. Fix Critical/Important before finishing.
6. Trust ledger + `git log` over memory after compaction.

## DO NOT

- NEVER skip task review ("it looks fine").
- NEVER proceed with unfixed Critical/Important issues.
- NEVER dispatch parallel implementers to the same codebase.
- NEVER paste the whole plan into a dispatch.
- NEVER re-dispatch a task marked complete in ledger.
- NEVER ask "should I continue?" between tasks.
- NEVER let self-review replace actual review (reviewer must be separate).
- NEVER tell reviewer what not to flag. NEVER claim "done" without verification commands.

## Workflow

1. Plan intake — read plan, create ledger + todos.
2. Per-task loop:
   - Write task brief `.tasks/task-{id}.md` (objective, files, constraints, acceptance criteria).
   - Dispatch implementer (fresh context, one task). Implementer writes `.tasks/report-{id}.md`.
   - Review: spec compliance + code quality, both PASS required.
   - Handle: PASS/PASS → complete + next. FAIL → re-dispatch (max 2 retries).
3. Final review — reviewer subagent across all changes: integration coherence, cross-task consistency, edge cases.
4. Finish — `finishing-branch` skill, update ledger.

## Blocked Handling

| Status | Action |
|--------|--------|
| DONE | Review immediately |
| NEEDS_CONTEXT | Provide context in brief, re-dispatch |
| BLOCKED | In order: provide context → more capable model → decompose → revise plan. All fail: stop, report. |

## Model Selection

| Task | Model |
|------|-------|
| Mechanical (clear spec, 1-2 files) | Cheapest |
| Integration (multiple files, cross-file) | Standard |
| Architecture, final review | Most capable |

## Reviewer Prompts

- Keep scope tight, no open-ended directives. Don't ask to re-run tests the implementer ran.
- Don't pre-judge findings. Include global constraints verbatim + `git diff BASE..HEAD`.
- Fix Critical/Important; note Minor in ledger.

## Ledger Format

```markdown
| # | Task | Status | Model | Spec | Quality | Commits | Notes |
|---|------|--------|-------|------|---------|---------|-------|
| 1 | Auth middleware | DONE | std | PASS | PASS | abc..def | |
```
Update after every completion/status change. On pass append: `Task N: complete (commits abc..def, review clean)`.

## Verification

- Ledger is source of truth; every task shows PASS/PASS or explicit block.
- No open Critical/Important issues before moving on.
- Verification commands run before any DONE.
