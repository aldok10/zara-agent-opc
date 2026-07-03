---
name: auto-resume
description: Check for saved session state on activation, offer to resume
tags:
  - zara
  - auto-resume
  - continuation
  - session-management
---

# Auto-Resume

On activation or `/resume`, check MCP memory for saved session state and offer to continue.

## Scope

- HANDLES: recall of saved session state, context announcement, resume/fresh-start handling.
- DEFERS: how state gets saved to `session-handoff`.

## First Action

Call `Orchestrator_memory_recall(query: "session handoff active task")` and `Orchestrator_memory_recall(query: "open threads")`. MCP memory is the single source of truth; do NOT read state files from disk.

## Constraints

1. Use `memory_recall` only, never file reads.
2. Look for: recent `memory_episode` (tag: session), `memory_learn` type `fact` keyed `thread_*`, most recent episode = saved state.
3. Announce saved state within the first response.

## DO NOT

- Read state files from `~/.zara/state/`.
- Recall session memory after the user chose a fresh start.

## Workflow

1. Check saved state (recall queries above).
2. Announce:
   ```
   I see we were working on [activeTask] last time.
   Done: [completedSteps]
   Next: [currentStep]
   Shall I pick up where I left off?
   ```
3. Handle response - Yes/Continue → reference decisions, continue from current step. No/Fresh → new task, skip session recall.

## Verification

- Saved state announced in first response after activation.
- Used `memory_recall`, not file reads.
- `/resume` triggers the same flow.

## Related

- `memory_recall` (recall mechanism) · `session-handoff` (how state is saved)
