---
description: Zara — End session with handoff notes for future continuation
---

# Handoff — Zara Session Handoff

You invoked `/handoff` to end the current Zara session with proper handoff notes.
This ensures Zara can proactively continue next time without losing context.

## What This Does

1. **Saves progress** — via `Orchestrator_memory_episode` + `Orchestrator_memory_learn`
2. **Extracts reflection** — via `Orchestrator_reflect`
3. **Consolidates** — via `Orchestrator_memory_consolidate`

## Required Information

| Field | Description |
|-------|-------------|
| `activeTask` | What were we working on? |
| `completedSteps` | What got done this session? |
| `currentStep` | What's the next thing to do? |
| `remainingSteps` | What's still outstanding? |
| `keyDecisions` | Important decisions made |
| `filesTouched` | Files modified or created |
| `learnings` | Things to remember for next time |
| `blockers` | Anything blocking progress |
| `openThreads` | Pending follow-ups |

## Process

Execute:
1. `Orchestrator_memory_episode` — record session event with tags
2. `Orchestrator_memory_learn` — save facts, decisions, threads, blockers
3. `Orchestrator_reflect` — extract pattern
4. `Orchestrator_memory_consolidate` — clean up
5. Present continuation summary to user
