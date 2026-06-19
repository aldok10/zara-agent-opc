---
name: session-handoff
description: Use when Zara needs to end a session with proper context preservation — saves progress, decisions, learnings for seamless cross-session continuation
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
This skill ensures no context is lost between sessions by saving structured state.

Session state is stored in this priority order:
1. **Global**: `~/.zara/state/current-session.json` — shared across all projects
2. **Local fallback**: `{project_root}/.zara/state/current-session.json` — if global is not writable
3. **Temp fallback**: System temp directory — last resort

History is append-only at the same location as the session file.

## Steps

### 1. Collect Session Data

Gather everything needed for the next session:

| Field | Required | Source |
|-------|----------|--------|
| activeTask | ✅ | What were we doing? |
| activeEpicId | ⚠️ | Cell ID if using hive |
| completedSteps | ✅ | What got done |
| currentStep | ✅ | What's next |
| remainingSteps | ✅ | Full remaining list |
| subAgentsEngaged | ✅ | Which sub-agents helped |
| keyDecisions | ✅ | Decisions + rationale |
| filesTouched | ✅ | Files we modified |
| learnings | ⚠️ | Things to remember |
| blockers | ⚠️ | What's blocking us |

### 2. Store Learnings to Hivemind

```javascript
hivemind_store({
  information: `Session summary: ${summary}`,
  tags: `session,${activeTask?.toLowerCase().replace(/\s+/g, ',')}`
});
```

### 3. Write State File

```javascript
// Path depends on availability: ~/.zara/state/ or ./.zara/state/
{
  "sessionId": "...",
  "agent": "zara",
  "activeTask": "...",
  "progress": {
    "completedSteps": [...],
    "currentStep": "...",
    "remainingSteps": [...]
  },
  "subAgentsEngaged": [...],
  "keyDecisions": [...],
  "filesTouched": [...],
  "lastActivity": "ISO timestamp",
  "completed": false
}
```

### 4. Append to History

```jsonl
// Same directory as session file
{"type":"handoff","sessionId":"...","timestamp":"...","task":"...","steps":2}
```

### 5. Sync Hive (if applicable)

If working on a tracked cell:
```javascript
hive_update({ id: cellId, status: "in_progress" });
// Or if completed: hive_close({ id: cellId, reason: "..." });
hive_sync();
```

### 6. Generate Continuation Prompt

Format for the next session:
```
## Session Handoff

**Last session**: [date]
**Task**: [activeTask]
**Completed**: [completedSteps]

**Next**: [currentStep]
**Remaining**: [remainingSteps]

**Key decisions**: [decisions]

**Sub-agents engaged**: [list]

**Learnings stored to Hivemind**
```

## Verification

- State file written correctly (global `~/.zara/state/` or local `./.zara/state/`)
- History entry appended
- Hivemind learning stored
- Hive cell status updated (if applicable)
- Next session activation announces saved state

## Related Files

- `.opencode/commands/handoff.md` — Handoff command
- `.opencode/commands/resume.md` — Resume command
- `plugins/zara-auto-resume.mjs` — Auto monitor
- `.opencode/skill/auto-resume/SKILL.md` — Related skill
