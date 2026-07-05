# Parallel Dispatch

Delegate independent problems to concurrent subagents. Each gets isolated context, focused scope, clear deliverables. Pays off at 3+ tasks.

## Scope

- HANDLES: parallel dispatch, prompt design, topology selection, conflict resolution, integration.
- DEFERS: isolated workspaces to `git-worktrees`; sequential task execution to `subagent-patterns.md`.

## First Action

Run the pre-dispatch protocol (below) silently before any dispatch.

## When to Use / NOT

| Use | NOT |
|-----|-----|
| 3+ test files failing, different root causes | Failures likely related |
| Multiple subsystems broken independently | Need full system understanding first |
| No shared state or sequential deps | Agents would edit same files |
| Isolated parallel investigations | Exploratory (don't know what's broken) |

## Pre-Dispatch Protocol (mandatory)

1. Reflect first  --  `reflect_suggest(situation)`. Pattern scores >0.7? Follow it.
2. Independence test  --  would one agent's output change if it saw another's? If yes: not independent, use pipeline.
3. File boundary check  --  two agents touch same file? Split scope or serialize.
4. Confidence check  --  each task well-defined enough to complete without questions? If vague: refine, don't dispatch.
5. Cost check  --  fan-out faster than sequential? Pays off at 3+.

## Constraints

1. Issue ALL dispatches in the same response (multiple = parallel, one per message = sequential).
2. Each prompt: specific scope, clear goal, constraints (file boundaries), context (errors + paths), expected output.
3. Include hard turn cap (15-25) in dispatch prompts.
4. Minimal context: spec + paths only (<1000 tokens, no history).
5. After all return: review summaries, check conflicts, run full suite, resolve integration.

## DO NOT

- "Fix all the tests" (too broad)  --  scope to one file/subsystem.
- Dispatch without pasting error messages + test names.
- Omit file-boundary constraints (agent refactors everything).
- Dispatch parallel implementers to overlapping file scope.
- Over-delegate what you could handle in 2 minutes.

## Topology Patterns

- Fan-Out (default): coordinator → workers → review → synthesize. Truly independent, no ordering.
- Pipeline: worker1 → worker2 → worker3. Each step depends on previous.
- Nested: coordinator → sub-coordinators → workers. Mega-task, multiple layers.

## Failure Modes

| Mode | Signal | Prevention |
|------|--------|-----------|
| Cycle formation | Agent retries same fix | Hard turn cap in prompt |
| Duplicate work | Overlapping scope | Explicit file boundaries |
| Error cascade | Bad upstream output | Per-stage validation (pipeline) |
| Silent drift | Wrong problem solved | Acceptance criteria in prompt |
| Context contamination | Too much irrelevant info | Minimal context |
| Over-delegation | Trivial dispatched | Self-assess first |

## Merge Strategy & Verification

- All subtasks done or explicitly blocked.
- No file conflicts between workers.
- Combined output coherent, full suite passes.
- If conflicts exist: resolve manually or dispatch single integration agent.
- Learnings recorded via `reflect` + `Orchestrator_memory(action:"learn")`.
