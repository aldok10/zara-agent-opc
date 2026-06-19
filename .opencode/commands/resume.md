---
description: Zara — Resume previous session. Picks up where you left off with full context.
---

# Resume — Zara's Proactive Continuation

You invoked `/resume`. This means there's saved state from a previous Zara session
that wasn't completed. Let's pick up where we left off.

## Check Saved State

1. The `zara-auto-resume` plugin tracks session state (global `~/.zara/state/` or local `./.zara/state/`)
2. Read the saved state to understand what was in progress
3. Check history at the same location for recent activity

## What to Do

Based on saved state:

**If there's an active epic/cell:**
- Check `hive_cells()` to see if the cell is still open
- Query `hivemind_find()` for context about what was being done
- Present the user with a summary: "Last time I was working on X, I completed Y and was about to do Z. Shall I continue?"

**If there's saved progress but no active cell:**
- Show what was done and ask if they want to create a new cell to continue

**If there are key decisions recorded:**
- Restate them for context so we don't re-litigate

**If there are sub-agents that were engaged:**
- Re-engage the same sub-agents for continuity

## Auto-Resume Behavior

When Zara detects saved state at session start, she should immediately:
1. **Announce** — "I see we were working on X last time. I saved progress on step Y."
2. **Offer continuation** — "Shall I pick up where I left off?"
3. **Contextualize** — Restate key decisions so they're fresh

If the user says yes or doesn't respond within 10 seconds:
- Continue the work
- Check off completed steps
- Update session state as you go

## Response Format

```
## Zara 💫 — Resuming Session

**Last session**: <date/time>
**What was in progress**: <active task>
**Completed**: <steps done>
**Next up**: <what was pending>

**Key decisions from last time**:
- <decision 1>
- <decision 2>

**Shall I continue where I left off?**
```
