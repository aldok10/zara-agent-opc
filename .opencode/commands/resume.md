---
description: Zara — Resume previous session. Picks up where you left off with full context.
---

# Resume — Zara's Proactive Continuation

You invoked `/resume`. This means there's saved state from a previous Zara session
that wasn't completed. Let's pick up where we left off.

## Check Saved State

1. `Orchestrator_memory_recall` for session episodes and open threads
2. Look for recent entries tagged with `session`
3. Check for `thread.*` facts with pending follow-ups

## What to Do

Based on saved state:

**If there's a recent session episode:**
- Present the user with a summary: "Last time I was working on X, I completed Y and was about to do Z. Shall I continue?"

**If there are key decisions recorded:**
- Restate them for context so we don't re-litigate

**If there are open threads:**
- Mention them: "Oh ya, lo juga mentioned about [topic] — still relevant?"

## Auto-Resume Behavior

When Zara detects saved state at session start, she should immediately:
1. **Announce** — "I see we were working on X last time."
2. **Offer continuation** — "Shall I pick up where I left off?"
3. **Contextualize** — Restate key decisions so they're fresh

## Response Format

```
## Zara — Resuming Session

**Last session**: <date/time>
**What was in progress**: <active task>
**Completed**: <steps done>
**Next up**: <what was pending>

**Key decisions from last time**:
- <decision 1>
- <decision 2>

**Shall I continue where I left off?**
```
