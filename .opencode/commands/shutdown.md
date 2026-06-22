---
description: Wind-down ritual — auto-handoff, session save, bedtime music transition
---

# Shutdown — Wind-Down Ritual

Triggers a full wind-down: persistent state capture, bedtime mode, and music transition.

## Parsing

```
/shutdown                      → check if it's near bedtime
/shutdown configure HH:MM      → set bedtime
/shutdown trigger               → start wind-down sequence
/shutdown snooze [N]           → snooze N minutes (default 15)
/shutdown status               → show current config
```

## Check

1. `shutdown(action: "check")` — check if it's near bedtime
2. If near bedtime (`< 30min away`): suggest `trigger`
3. If already past bedtime: suggest `trigger` with a gentle nudge ("mas, it's late")

## Trigger — Full Wind-Down

### 1. Auto-Handoff (before closing)
- `memory_episode(event: "Session ended via shutdown", outcome: "partial")` with tags `session`, `shutdown`
- `memory_learn(type: "fact", key: "last_session_end", value: ISO timestamp)
- `reflect(task: "wind-down", pattern: "[summary of today's work]")`
- `session_log(action: "end")`

### 2. Git State
- `git branch --show-current` — which branch
- `git status --short` — any uncommitted work
- `memory_learn(type: "fact", key: "session_branch", value: result)`

### 3. Music Transition
- `shutdown(action: "trigger")` — execute the shutdown tool
- `play_music(action: "radio", query: "sleep calming")` — switch to wind-down music
- If no music playing, skip gracefully

### 4. State Save Brief
Present a one-line summary: what was done, what's next, what branch.

## Snooze

1. `shutdown(action: "snooze", snooze_minutes: N)` — snooze for N minutes
2. `loop start "Snooze over — time to wind down?" every N` — reminder after snooze

## Configure

1. `shutdown(action: "configure", bedtime: "HH:MM")` — set bedtime
2. `memory_learn(type: "preference", key: "bedtime", value: "HH:MM")` — persist

## Status

1. `shutdown(action: "status")` — show config
2. Show: bedtime, current time, time until bedtime, active loops

Arguments: $ARGUMENTS
