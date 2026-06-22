---
description: Goal management - set, track, and complete goals with memory persistence and reflect
---

# Goal - Managed Progress Tracking

Manages a goal/exit condition with memory persistence and reflect on completion.

## Parsing

```
/goal [condition]      → set goal (e.g. /goal all auth tests pass)
/goal status            → check current goal progress
/goal check             → check + suggest next step
/goal done              → mark achieved, reflect, persist
/goal clear             → remove current goal without reflect
```

## Set Goal

1. `goal(action: "set", condition: "$ARGUMENTS")` - set the exit condition
2. `memory_learn(type: "fact", key: "current_goal", value: "$ARGUMENTS")` - persist for crash recovery
3. `reflect_suggest(situation: "$ARGUMENTS")` - what approach worked for similar goals
4. `knowledge_passage(query: "$ARGUMENTS approach")` - find relevant patterns
5. `memory_learn(type: "workflow", key: "goal_started_$ARGUMENTS", value: timestamp)` - track timing

## Status

1. `goal(action: "status")` - current goal state
2. `session_log(action: "check")` - how long working on this
3. Show: goal condition, progress, elapsed time

## Check

1. `goal(action: "check")` - check progress
2. If progress stalled: suggest specific next step based on context
3. If blocked: `blindspot_check(context: "$ARGUMENTS")` + suggest unblocking approach

## Done

1. `goal(action: "done")` - mark completed
2. `memory_learn(type: "fact", key: "current_goal", value: "")` - clear persisted goal
3. `reflect(task: "$ARGUMENTS", outcome: "success")` - extract pattern
4. `memory_episode(event: "Goal completed: $ARGUMENTS", outcome: "success")` - episode record
5. `session_log(action: "check")` - suggest break if needed
6. Acknowledge specifically what was achieved

## Clear

1. `goal(action: "clear")` - remove goal
2. `memory_learn(type: "fact", key: "current_goal", value: "")` - clear persistence
3. Clean up: no reflect, no episode - goal was abandoned, not completed

Arguments: $ARGUMENTS
