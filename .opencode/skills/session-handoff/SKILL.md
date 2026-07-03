---
name: session-handoff
description: End session with context preservation for continuation
tags:
  - zara
  - handoff
  - session
  - continuity
  - checkpoint
---

# Session Handoff

Preserve session state into MCP memory at session end so nothing is lost between sessions.

## Scope

- HANDLES: session data collection, MCP memory persistence, continuation summary.
- DEFERS: recall/resume to `auto-resume`; periodic maintenance to `memory_consolidate`.

## First Action

Collect session data. MCP tools are the single source of truth; do NOT write state files to disk.

## Constraints

1. Persist via `Orchestrator_memory_*` only. No files to `~/.zara/state/` or anywhere on disk.
2. Record each key decision/fact/thread with `memory_learn`.
3. Record the session as one event with `memory_episode`.
4. Extract at least one pattern with `reflect` per non-trivial task.
5. Call `memory_consolidate` at session end (merge dupes, archive stale).

## DO NOT

- Write `current-session.json` or any state file to disk.
- Call `hivemind_store` / `hive_sync` (these tools don't exist).
- Assume file-based state survives compaction (it doesn't).

## Workflow

1. Collect data - activeTask, completedSteps, currentStep, remainingSteps, keyDecisions, filesTouched (required); learnings, blockers, openThreads (optional).
2. Persist via MCP:
   - `memory_episode` - session as one event with tags.
   - `memory_learn` - by type: `fact` (threads/next-steps/blockers), `decision`, `pitfall`, `preference`, `workflow`, `architecture`, `policy`.
   - `reflect` - what worked/failed, one per non-trivial task.
   - `memory_consolidate` - merge duplicates, archive stale.
3. Save open threads - each as `memory_learn` keyed `thread.<project>.<topic> = status + details`.
4. Continuation summary (text response, not a file):
   ```
   **Session**: [date]
   **Done**: [completedSteps]
   **Next**: [currentStep / open threads]
   **Key decisions**: [decisions]
   ```

## Verification

- `memory_learn` called per key decision/fact/thread.
- `memory_episode` recorded the session.
- `reflect` extracted ≥1 pattern.
- No files written to disk.
- `memory_stats` confirms entries increased.

## Related

- `memory_recall` (resume next session) · `memory_consolidate` (maintenance) · `reflect` (patterns) · `auto-resume` (how state is recalled)
