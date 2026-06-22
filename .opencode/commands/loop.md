---
description: Recurring loops — timer reminders, engineering patterns, verification gates, study/research cycles
---

# Loop — Multi-Mode Recurring Cycles

Parse arguments to determine the loop type. Supports 5 modes.

## Mode 1: Simple Timer (Backward Compat)
Keep me on track with periodic reminders.

```
/loop [interval] [prompt]
/loop 30m run tests          → remind every 30min
/loop 1h take a break        → hourly break reminder
/loop 5m what's next?        → quick check-in every 5min
```

## Mode 2: Loop Engineering Pattern
Apply a structured loop pattern to a task. Each pattern loads relevant skills and sets up verification gates.

```
/loop [pattern] [task]
```

| Pattern | Alias | Loads Skill | Best For |
|---------|-------|-------------|----------|
| `tdd` | — | `tdd` | Features with clear test cases |
| `compiler` | `compile` | — | Refactoring, fixing type errors |
| `pav` | `plan-act-verify` | `writing-plans` | Complex multi-step features |
| `hypothesis` | `hyp` | `systematic-debugging` | Bugs, root cause analysis |
| `incremental` | `incr` | — | Migrations, large refactors |

When using a pattern:
1. **Load skill** — load the matching skill from the table above
2. **Ground** — `knowledge_passage(query: "[pattern] [task]")` for proven approaches + `reflect_suggest(situation: "[task]")` for past wins
3. **Plan** — Break task into loop iterations (each iteration = one small verify-able step)
4. **Set timer** — `loop start "[pattern]: [task - iteration N]" interval="[auto]"` for periodic check-ins
5. **Gate** — Before each iteration completes, run the pattern's verification (red→green for tdd, compile for compiler, acceptance criteria for pav, evidence for hypothesis, one-path for incremental)
6. **Adapt** — After each iteration, `goal check` + `memory_learn(key: "loop_progress_[task]", value: iteration state)`. If pattern doesn't fit, switch.
7. **Close** — When done: `reflect` with outcome + `memory_learn(type: "decision")` for key learnings

## Mode 3: Verification Gate
Keep checking until a condition is met, then auto-stop.

```
/loop verify [condition] [interval]
/loop verify "all tests pass" 5m    → check every 5min until green
/loop verify "lint clean" 10m        → check every 10min until clean
/loop verify "coverage > 80%" 15m   → check until threshold met
```

Default interval: 5m. Loop auto-stops when condition passes.
**Agent dispatch**: if a verify gate keeps failing or the loop isn't converging, escalate:
- Loop isn't converging → `task(subagent_type: "loop-engineer", prompt: "Loop not converging: [condition]. Diagnose the loop failure and recommend a different pattern.")`
- Test failures → `task(subagent_type: "testing-lead", ...)` 
- Security issues → `task(subagent_type: "security-reviewer", ...)`
- Architecture drift → `task(subagent_type: "architect", ...)`
- Code quality → `task(subagent_type: "code-reviewer", ...)`

## Mode 4: Loop Design (Deep)
Design a custom verification strategy for a complex task.

```
/loop design [topic]
/loop design payment flow verification
/loop design database migration strategy
```

This routes to **@rhythm** — load `loop-engineer` agent via `task`.
- @rhythm will analyze the task and design: loop pattern, verification gates, failure modes, context budget
- After design completes: `memory_learn(type: "architecture")` the strategy
- Optionally set a timer loop to execute the designed pattern

## Mode 5: Study / Research
Periodic knowledge acquisition on a topic.

```
/loop study [topic] [interval]
/loop study goroutine patterns 1h      → research Go concurrency
/loop study vector databases 2h         → research vector DB patterns
/loop study CVE roundup 24h            → daily security bulletin
```

Each cycle:
1. `websearch(query: "[topic] 2026")` — latest info
2. `knowledge_passage(query: "[topic]")` — existing knowledge
3. `memory_learn(type: "fact")` — persist findings
4. Summarize: what's new, why it matters for your stack

## Mode 6: Management

```
/loop list              → show all active loops
/loop stop [id]         → stop a specific loop by ID or prompt
/loop clear             → stop ALL loops
/loop check             → check if any loops are due (auto-fire on session)
```

## Parse Rules

First arg determines mode:
- `list|clear|stop|check` → management mode
- `\d+(s|m|h|d)` → simple timer mode (backward compat)
- `verify` → verification gate mode
- `design` → loop design mode (routes to @rhythm)
- `study` → study/research mode
- `tdd|compiler|compile|pav|plan-act-verify|hypothesis|hyp|incremental|incr` → pattern mode
- `*` → simple timer (default interval 10m)

## Tool Mapping

| Mode | Primary Tool | MCP Integration | Plugin Hook |
|------|-------------|-----------------|-------------|
| Timer | `loop` tool | — | flow (scheduler) |
| Pattern | `skill` + `loop` + `reflect_suggest` | `knowledge_passage` + `goal` + `reflect` | flow + memory + evolve |
| Verify | `loop` + agent dispatch | `goal(action: "check")` | flow + observe |
| Design | `task` → @rhythm | `knowledge_passage` + `memory_learn` | flow |
| Study | `websearch` + `knowledge_passage` | `memory_learn(type: "fact")` | memory |
| Manage | `loop` tool | — | flow |

Arguments: $ARGUMENTS
