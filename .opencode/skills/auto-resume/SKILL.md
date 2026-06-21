---
name: auto-resume
description: Use when Zara activates to check for saved session state — detects incomplete work and proactively offers to resume without user prompting, using MCP memory recall
tags:
  - zara
  - auto-resume
  - continuation
  - session-management
---

# Skill: Auto-Resume for Zara

**Trigger**: On Zara activation or `/resume` command
**Tags**: zara, auto-resume, continuation

## Context

Zara saves session state to MCP memory at session end. On activation, use
`Orchestrator_memory_recall` to check for open session state instead of reading
files from disk.

**Key constraint**: Do NOT read state files from `~/.zara/state/` — MCP memory
is the single source of truth.

## Steps

### 1. Check for Saved State

On activation, call:

```
Orchestrator_memory_recall(query: "session handoff active task")
Orchestrator_memory_recall(query: "open threads")
```

Look for:
- Recent `memory_episode` entries with tags: session
- `memory_learn` entries with type: `fact` and keys prefixed `thread.`
- The most recent episode indicates saved session state

### 2. Announce Context

Present a clear summary to the user:
```
I see we were working on [activeTask] last time.
Done: [completedSteps]
Next: [currentStep]
Key decisions: [summary]

Shall I pick up where I left off?
```

### 3. Handle User Response

| Response | Action |
|----------|--------|
| Yes / Continue | Reference saved decisions, continue from current step |
| No / Fresh start | Start new task, don't recall session memory |


## Verification

- After activation, Zara announces any saved session state within first response
- Uses `Orchestrator_memory_recall`, not file reads
- `/resume` command triggers the same recall flow

## Related

- `Orchestrator_memory_recall` — the only recall mechanism needed
- `session-handoff` — how state gets saved in the first place
