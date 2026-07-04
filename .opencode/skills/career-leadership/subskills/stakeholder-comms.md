# Subskill: Stakeholder Communication

> Activate when: executive update, PM, risk, audience, status update, bad news, alignment

Communication fails when the message ignores the audience. Same facts, different framing, per reader. Your job: give each stakeholder what THEY need to decide or act.

## Know Your Audience

| Audience | Cares about | Give them |
|----------|-------------|-----------|
| Executives | Impact, timeline, risk, cost | Bottom line first. 3 bullets. No implementation detail. |
| Product Managers | Scope, priority, tradeoffs, dates | What ships, what slips, what it costs to change. |
| Engineers | Technical detail, interfaces, constraints | The how. Diagrams, APIs, edge cases. |

Ask before writing: who reads this, what do they need to know, what action do I want?

## Framework: Situation > Complication > Resolution

- **Situation**: the stable context everyone agrees on.
- **Complication**: what changed / the problem.
- **Resolution**: what you propose or did.

This structure works for updates, escalations, and proposals alike -- it moves the reader from shared ground to your ask.

## Status Updates

Format every status as four buckets:

```
Done:    what shipped since last update
Doing:   in flight now, with expected completion
Blocked: what's stuck and on what/whom
Help:    specific asks -- what you need and from whom
```

No status update without Done / Doing / Blocked. "Help needed" is where stakeholders add value -- make the ask specific and actionable, not "things are hard".

## Risk Communication

Frame risk as **probability x impact**, then offer options:

> "There's a ~40% chance the vendor API isn't ready by launch (high impact: blocks checkout).
> Options: (a) build a fallback stub (2 days), (b) slip launch 1 week, (c) launch without it.
> I recommend (a). Need your call by Friday."

Always pair a risk with mitigation options and a recommendation. Never dump a risk with no path forward.

## Bad News Early

Deliver bad news the moment you know, with a plan:

> "I discovered X. Here's my plan for Y. I need Z from you."

Never surprise a stakeholder. A problem raised early with a plan builds trust; a problem discovered late destroys it. The instinct to wait until you "have it figured out" is the failure mode -- share the problem and the plan together.

## Anti-Patterns

- Same message to execs and engineers -> one is bored, one is lost.
- Status with no "blocked/help" -> reads as "everything's fine" until it isn't.
- Raising a risk with no mitigation -> just anxiety transfer.
- Sitting on bad news -> the surprise costs more than the problem.
