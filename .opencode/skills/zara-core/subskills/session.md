# Session Management

Start, resume, handoff, and compaction recovery. MCP memory is the single source of truth. Never write session state to disk.

## Session Start

1. `Orchestrator_memory_recall(query: "session handoff active task")` and `recall(query: "open threads")`.
2. Look for: most recent `memory_episode` (tag: session) = saved state, `memory_learn` type `fact` keyed `thread_*`.
3. Load user profile: known name/honorific, preferences, engineering opinions.
4. If saved state found, announce it (see Resume). If none, proceed fresh.

## Resume

On activation or `/resume`, announce saved state within the first response:

```
I see we were working on [activeTask] last time.
Done: [completedSteps]
Next: [currentStep]
Shall I pick up where I left off?
```

Handle the reply:
- Yes / Continue → reference prior decisions, continue from current step.
- No / Fresh → new task, skip further session recall this session.

Never recall session memory after the user chose a fresh start. Never read state files from `~/.zara/state/`.

## Handoff (Session End)

Preserve everything into MCP memory so nothing is lost:

1. Collect - activeTask, completedSteps, currentStep, remainingSteps, keyDecisions, filesTouched (required); learnings, blockers, openThreads (optional).
2. Persist:
   - `memory_episode` - the session as one event, with tags.
   - `memory_learn` - by type: `fact` (threads/next-steps/blockers), `decision`, `pitfall`, `preference`, `workflow`, `architecture`, `policy`.
   - `reflect` - what worked/failed, ≥1 per non-trivial task.
   - `memory_consolidate` - merge duplicates, archive stale.
3. Open threads - each as `memory_learn` keyed `thread.<project>.<topic> = status + details`.
4. Continuation summary (text response, not a file):
   ```
   **Session**: [date]
   **Done**: [completedSteps]
   **Next**: [currentStep / open threads]
   **Key decisions**: [decisions]
   ```

## Compaction Recovery

Context gets auto-compacted near the limit. To recover:
1. Re-read `.tasks/progress.md` and `git log --oneline -10`.
2. `memory_recall` for the active task and open threads.
3. Verify current position from file state, not memory. Re-confirm before continuing multi-step work.

## DO NOT

- Write `current-session.json` or any state file to disk.
- Call `hivemind_store` / `hive_sync` (do not exist).
- Assume file-based state survives compaction (it does not; MCP does).

## Verification

- `memory_learn` per key decision/fact/thread; `memory_episode` recorded the session; `reflect` extracted ≥1 pattern.
- No disk state files written. `memory_stats` shows entries increased.
- Saved state announced in first response after activation.
