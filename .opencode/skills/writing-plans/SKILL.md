---
name: writing-plans
description: Write implementation plans before touching code
trigger: After brainstorming approval, or when user has clear requirements for implementation
---

# Writing Plans

Write implementation plans assuming the engineer has zero codebase context. Document which files, exact code, tests, and how to verify.

## Scope

- HANDLES: requirement analysis, file mapping, task breakdown, plan document, execution handoff.
- DEFERS: design/spec to `brainstorming`; execution to `subagent-driven-dev` or `executing-plans`.

## First Action

Read the spec/requirements. Identify inputs, outputs, constraints, feature dependencies, existing code touched.

## Constraints

1. Bite-sized tasks (2-5 min each), one commit per task.
2. DRY (never repeat logic), YAGNI (only what spec requires), TDD (test first).
3. Every spec requirement maps to at least one task; every non-goal maps to zero tasks.
4. Types/interfaces consistent across all tasks; file paths consistent (no typos).
5. Split a task if it touches >3 files, has >5 steps, or mixes concerns.
6. Save to `docs/plans/YYYY-MM-DD-<feature>.md`.

## DO NOT (plan failures)

- NO placeholders: "TBD", "TODO", "implement later", "add appropriate error handling", "similar to Task N", "follow the same pattern", "update as needed". Can't write exact code = don't understand it yet.
- No tasks depending on unwritten tasks without explicit interface contracts.
- No mixing refactoring with feature work in one task.
- No plans without test steps.
- No writing code before the plan is approved.

## Workflow

1. Analyze requirements.
2. Map file structure - list ALL files under Create / Modify / Test with purpose.
3. Write plan doc:
   - Header: Goal, Architecture, Tech Stack, Global Constraints, Non-Goals, Estimated Tasks.
   - Per task: Files (create/modify/test), Interfaces (consumes/produces), Steps (write test with exact code → implement with exact code → run+verify with expected output → commit with message).
4. Right-size tasks (2-5 min, own test cycle, single commit, independently verifiable).
5. Self-review checklist (below).
6. Execution handoff.

## Self-Review Checklist

- [ ] Every spec requirement maps to a task.
- [ ] Every non-goal covered by no task.
- [ ] No placeholders (grep TBD/TODO/similar to/as needed).
- [ ] Types/interfaces + file paths consistent.
- [ ] Each task's test tests what it implements.
- [ ] Run commands include expected output.
- [ ] Commit messages meaningful.

## Execution Handoff

Ask: "Plan ready. Execute with subagents (recommended) or inline?"
- Subagents → `subagent-driven-dev` (fresh context per task + two-stage review, higher quality).
- Inline → `executing-plans`.

## Verification

- Plan exists at `docs/plans/` path.
- Self-review checklist fully passes before presenting.

## Related Skills

| When | Load |
|------|------|
| Produces the spec | `brainstorming` |
| Execute with subagents | `subagent-driven-dev` |
| Execute inline | `executing-plans` |
| 3+ parallel tasks | `dispatching-parallel-agents` |

## Knowledge (load on demand)

- `knowledge_index(section: "architecture")` · `knowledge_index(section: "practices")`
- `Orchestrator_memory(action:"recall", query:query: "vertical slice incremental development", layer:"knowledge")`
