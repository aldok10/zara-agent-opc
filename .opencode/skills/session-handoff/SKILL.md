---
name: session-handoff
description: Use when Zara needs to end a session with proper context preservation - saves progress, decisions, learnings for seamless cross-session continuation via MCP memory tools
tags:
  - zara
  - handoff
  - session
  - continuity
  - checkpoint
---

# Skill: Session Handoff for Zara

**Trigger**: End of session, `/handoff` command, or context pressure
**Tags**: zara, handoff, session, checkpoint

## Context

Zara sessions may end naturally, due to context limits, or by user command.
This skill ensures no context is lost between sessions by saving structured state
into Zara's MCP memory system.

**Key constraint**: Do NOT write state files to disk (`~/.zara/state/`, `.zara/state/`, etc).
The MCP tools (`Orchestrator_memory_*`) are the single source of truth for persistence.

## Steps

### 1. Collect Session Data

Gather everything for the next session:

| Field | Required | Source |
|-------|----------|--------|
| activeTask | ✅ | What were we doing? |
| completedSteps | ✅ | What got done |
| currentStep | ✅ | What's next |
| remainingSteps | ✅ | Full remaining list |
| keyDecisions | ✅ | Decisions + rationale |
| filesTouched | ✅ | Files we modified |
| learnings | ⚠️ | Things to remember |
| blockers | ⚠️ | What's blocking us |
| openThreads | ⚠️ | Pending follow-ups |

### 2. Persist via MCP Memory

Use these tools in order:

**Episodic** - `Orchestrator_memory_episode`
- Record the session as a single event with tags
- Include: what happened, outcome, tags for retrieval

**Semantic (facts)** - `Orchestrator_memory_learn`
- Type: `fact` - for open threads, next steps, blockers
- Type: `decision` - for key decisions with rationale
- Type: `pitfall` - for mistakes to avoid next time
- Type: `preference` - for user preferences discovered
- Type: `workflow` - for reusable procedures found
- Type: `architecture` - for structural decisions
- Type: `policy` - for rules to follow

**Reflection** - `Orchestrator_reflect`
- Extract pattern: what worked, what failed
- One reflection per non-trivial task

**Consolidation** - `Orchestrator_memory_consolidate`
- Call at session end to merge duplicates and archive stale entries

### 3. Save Open Threads as Facts

Each open thread gets its own `memory_learn` with tag/key prefixed by `thread.`:
```
thread.<project>.<topic> = status + details
```

### 4. Generate Continuation Summary

Format as text response to user (don't write to file):

```
**Session**: [date]
**Done**: [completedSteps]
**Next**: [currentStep / open threads]
**Key decisions**: [decisions]
```

## Verification

- `Orchestrator_memory_learn` called for each key decision/fact/thread
- `Orchestrator_memory_episode` recorded the session event
- `Orchestrator_reflect` extracted at least one pattern
- No files written to `~/.zara/state/` or anywhere on disk
- `Orchestrator_memory_stats` confirms entries increased

## Related

- `Orchestrator_memory_recall` - resume context next session
- `Orchestrator_memory_consolidate` - periodic maintenance
- `Orchestrator_reflect` - pattern extraction

## Anti-Patterns

- ❌ Writing `current-session.json` to disk - use MCP memory only
- ❌ `hivemind_store` / `hive_sync` - these tools don't exist
- ❌ Assuming file-based state survives compaction - it doesn't
- ✅ Trust MCP memory - it's designed for cross-session continuity
