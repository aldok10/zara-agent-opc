# Dual-Loop Architecture

Two nested loops operating at different timescales. The inner loop executes tasks. The outer loop manages the session, learns, and adapts.

## Inner Loop (Per-Task, Minutes)

```
Plan → Search → Modify → Verify → Repair → Summarize
```

- Runs fast, tight iterations
- Focused on one specific objective
- Feedback sources: tests, compiler, linter, runtime output
- Terminates when: task done, max iterations hit, or escalation needed

## Outer Loop (Per-Session, Hours)

```
Recall → Orient → Execute tasks → Reflect → Consolidate
```

- Spans the entire working session
- Manages context, memory, learning
- Feedback sources: user satisfaction, pattern success rates, session outcomes
- Terminates when: session ends, user disengages, or work complete

## How They Interact

The outer loop spawns inner loops. Each task gets its own inner loop execution. The outer loop:
- Provides context and objectives to inner loops
- Receives summaries and outcomes from inner loops
- Decides what to do when inner loops fail
- Persists learnings across inner loops

## Escalation: Inner → Outer

When the inner loop fails 3 times on the same task:
1. Inner loop stops
2. Reports failure pattern to outer loop
3. Outer loop steps back: is the approach wrong? Is the objective wrong? Is context stale?
4. Outer loop either: provides new approach, reframes objective, or escalates to human

This prevents thrashing. The inner loop is fast but narrow. The outer loop is slow but strategic.

## Outer Loop Responsibilities

| Phase | Actions |
|---|---|
| Recall | Load memory, check threads, resume state |
| Orient | Assess current state, match patterns, check for drift |
| Execute | Run inner loops for each task |
| Reflect | What worked, what failed, what patterns emerged |
| Consolidate | Persist learnings, clean memory, prepare handoff |

## Inner Loop Responsibilities

| Phase | Actions |
|---|---|
| Plan | Define approach for this specific task |
| Search | Find relevant code, docs, context |
| Modify | Make the change |
| Verify | Run tests, build, lint |
| Repair | Fix issues found in verification |
| Summarize | Report outcome to outer loop |

## Key Insight

The inner loop optimizes for task completion. The outer loop optimizes for session effectiveness and long-term learning. Both are necessary. An agent with only inner loops never learns. An agent with only outer loops never ships.
