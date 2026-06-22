---
description: Focus mode — lock into a task with session tracking, skills, and check-in loops
---

# Focus — Lock Into a Task

Sets a focus task with full session tracking, skills, and periodic check-ins.

## Parsing

```
/focus [task description]    → set focus
/focus status                 → what am I focused on?
/focus done                   → clear focus, celebrate
/focus loop [interval]        → focus with @rhythm check-in loop
```

## Set Focus

1. **Load skill** — Auto-detect and load relevant skill:
   - Go project? → `skill("golang-expert")`
   - PHP project? → `skill("php-expert")`
   - TypeScript? → `skill("typescript-expert")`
   - Bug? → `skill("systematic-debugging")`
   - Test? → `skill("tdd")`
   - Architecture? → `skill("brainstorming")`
2. **Track** — `todowrite` with focus as `in_progress`
3. **Persist** — `memory_learn(type: "fact", key: "current_focus", value: "[task]")`
4. **Session** — `session_log(action: "start", context: "[task]")`
5. **Knowledge** — `reflect_suggest(situation: "[task]")` + `blindspot_check(context: "[task]")`
6. **Loop** — Set `loop start "Still on: [task]?" every 30m` for periodic check-in
7. **Acknowledge** — Short confirmation. That's it.

## Check Status

1. `goal(action: "status")` — what's the current goal state
2. `session_log(action: "check")` — how long has it been
3. Show: focus task, elapsed time, current step from todowrite

## Focus Done

1. **Clear** — `loop clear` (stop all check-ins)
2. **Save** — `memory_learn(type: "workflow", key: "focus_completed_[task]", value: summary)`
3. **Session** — `session_log(action: "check")` — suggest break if >90min
4. **Reflect** — `reflect(task: "[task]", outcome: "success")`
5. **Celebrate** — Genuine acknowledgment. Something specific about what was done.

## Focus Loop Mode

`/focus loop [interval]` — sets focus with @rhythm for structured check-in cycles:
1. `task(subagent_type: "loop-engineer", prompt: "Design a focus loop for [task] with [interval] check-ins, verification gates at each check, and failure detection.")`
2. Apply @rhythm's recommendation

Arguments: $ARGUMENTS
