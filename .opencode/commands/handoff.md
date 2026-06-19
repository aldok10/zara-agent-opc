---
description: Zara — End session with handoff notes for future continuation
---

# Handoff — Zara Session Handoff

You invoked `/handoff` to end the current Zara session with proper handoff notes.
This ensures Zara can proactively continue next time without losing context.

## What This Does

1. **Saves progress** — to global `~/.zara/state/` or local `./.zara/state/` (auto-fallback)
2. **Appends to history** — same directory as session file
3. **Syncs Hivemind** learnings for cross-session memory
4. **Updates hive cells** with completion status
5. **Generates continuation prompt** for next session

## Required Information

Collect this before running the handoff:

| Field | Description |
|-------|-------------|
| `activeTask` | What were we working on? |
| `completedSteps` | What got done this session? |
| `currentStep` | What's the next thing to do? |
| `remainingSteps` | What's still outstanding? |
| `subAgentsEngaged` | Which sub-agents were involved? |
| `keyDecisions` | Important decisions made |
| `filesTouched` | Files modified or created |
| `learnings` | Things to remember for next time |
| `blockers` | Anything blocking progress |

## Process

```
## Zara 💫 — Session Handoff

**Session summary**:
Completed this session:
- <step 1>
- <step 2>

Next session should:
- <step 3>
- <step 4>

**Key decisions**:
- <decision with rationale>

**Learnings stored to Hivemind**:
- <learning 1>
- <learning 2>

**Files touched**: <list of file paths>

**State saved**: ~/.zara/state/ or ./.zara/state/ (auto-detected)
**Hive synced**: <cell status>

See you next time!
```

Execute:
1. Store learnings via `hivemind_store()`
2. Save state (auto-selects global or local dir)
3. Update hive cell status
4. Sync hivemind
