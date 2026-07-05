---
name: engineering-workflow
description: "Engineering workflow: brainstorm, plan, execute, dispatch, verify cycle"
---

# Engineering Workflow

Meta-workflow governing every multi-step engineering task. Never one-shot: gather → act → verify → repeat. Process scales with complexity, never skips.

## The Cycle

```
brainstorm → plan → execute (inline | subagent | parallel) → verify → validate
```

Each phase is one testable sentence. Trivial tasks (1-2 files, clear pattern) may collapse phases; complex tasks (6+ files, cross-cutting) run every phase in full.

## Phases

1. **Brainstorm** - explore intent + requirements before code. Design first, always. → `subskills/brainstorming.md`
2. **Plan** - write implementation plan assuming zero codebase context: exact files, code, tests, verification. → `subskills/planning.md`
3. **Execute** - implement task by task with review checkpoints. Inline or via subagents. → `subskills/execution.md`
4. **Dispatch** - for 3+ independent concurrent tasks, fan out to isolated subagents. → `subskills/parallel-dispatch.md`
5. **Subagent patterns** - fresh subagent per task, two-stage review gates, ledger tracking. → `subskills/subagent-patterns.md`

## Execution Mode Selection

| Situation | Mode | Subskill |
|-----------|------|----------|
| Subagents available, sequential tasks | Subagent-driven (higher quality) | `subagent-patterns.md` |
| Subagents unavailable / user prefers inline | Inline batch | `execution.md` |
| 3+ truly independent tasks, no shared files | Parallel fan-out | `parallel-dispatch.md` |

Default to subagent-driven when subagents are available: isolated contexts + review gates yield higher quality.

## Non-Negotiables

1. NO code until design is approved. Simple gets short design, complex gets thorough.
2. Plans have NO placeholders ("TBD", "TODO", "follow the same pattern"). Can't write exact code = don't understand it yet.
3. Every spec requirement maps to ≥1 task; every non-goal maps to 0 tasks.
4. TDD per task: failing test → watch fail → minimal code → watch pass → commit. One commit per task.
5. Never claim "done" without verification command output.
6. Two review verdicts per task (spec compliance + code quality), both must PASS.
7. Same error 2x → STOP, diagnose root cause, escalate. No self-correction loops >2.
8. After compaction: trust `.tasks/progress.md` ledger + `git log` over memory.

## Constraints (apply across all phases)

- DRY (never repeat logic), YAGNI (only what spec requires), TDD (test first).
- Bite-sized tasks: 2-5 min, ≤3 files, ≤5 steps, single commit, independently verifiable. Split if it exceeds.
- Never mix refactoring with feature work in one task.
- Never start on main/master without explicit consent.
- Never pause between tasks without a blocker. Never ask "should I continue?" mid-execution.
- Never dispatch parallel implementers to overlapping file scope.

## Stop and Ask When

- Verification fails >2 attempts.
- Plan step ambiguous (can't determine what to build).
- Missing dependency blocks progress.
- Architecture question the plan doesn't address.

Don't guess through blockers.

## Artifacts

| Phase | Path |
|-------|------|
| Design spec | `docs/specs/YYYY-MM-DD-<topic>-design.md` |
| Implementation plan | `docs/plans/YYYY-MM-DD-<feature>.md` |
| Task ledger | `.tasks/progress.md` |
| Per-task brief / report | `.tasks/task-{id}.md` / `.tasks/report-{id}.md` |

## Verification (whole cycle)

- Spec exists with testable acceptance criteria, user-approved before planning.
- Plan self-review passes (every requirement mapped, no placeholders, consistent types/paths).
- Each task's verification passes before marking complete; full suite passes before finishing.
- No open Critical/Important review issues before moving on.
- Learnings recorded via `reflect` + `Orchestrator_memory(action:"learn")`.

## Agent Routing (when depth needed)

| Topic | Dispatch |
|-------|----------|
| Vague / exploratory | scout |
| Architecture, system design | atlas |
| Code organization, review | lens |
| Security, auth, threats | shield |
| Test strategy, coverage | probe |
| Delivery, scope, priorities | pulse |
| 3+ parallel streams | hive |
| Loop / harness design | rhythm |
| Implementation | forge |
| Quality + validation | refiner |

## Knowledge

- knowledge/agentic-workflows.md
- knowledge/planning-techniques.md
- knowledge/delivery-patterns.md
- knowledge/development-methodologies.md
- knowledge/team-productivity.md
- knowledge/references.md
