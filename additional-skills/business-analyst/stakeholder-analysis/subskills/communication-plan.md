---
type: subskill
title: "Communication Plan"
---

# Communication Plan

Frequency, channels, escalation paths, and RACI for stakeholder communication.

## When to Load

- Setting up project communication structures
- Defining escalation paths for issues and decisions
- Creating RACI matrices for clarity of responsibility
- Reducing communication overhead while maintaining alignment

## Key Concepts

**RACI Matrix** -- Responsible (does the work), Accountable (owns the decision, one per item), Consulted (provides input before), Informed (notified after). Prevents diffusion of responsibility.

**Communication Cadence** -- Match frequency to stakeholder needs: daily (team), weekly (sponsors), biweekly (steering committee), monthly (broader org). More frequent is not always better.

**Channels** -- Synchronous (meetings, calls) vs asynchronous (email, Slack, documents). Use sync for decisions and alignment. Use async for updates and information sharing.

**Escalation Path** -- Clear criteria for when to escalate: budget overrun >10%, schedule slip >1 week, unresolved blocker >3 days. Name the person at each level. Do not skip levels.

**Information Architecture** -- Single source of truth for project status. Dashboard > status email > meeting update. Reduce "where do I find X?" questions.

## Patterns

```markdown
# RACI Matrix

| Decision/Task | PM | Tech Lead | Designer | VP Eng | Legal |
|---------------|------|-----------|----------|--------|-------|
| Sprint planning | A | R | C | I | - |
| Architecture decisions | I | A/R | I | C | - |
| Release go/no-go | A | R | C | I | C |
| Budget changes | R | C | - | A | I |
| Data privacy review | I | C | - | I | A/R |

# Communication Schedule

| Audience | Channel | Frequency | Content | Owner |
|----------|---------|-----------|---------|-------|
| Dev team | Standup | Daily | Blockers, progress | Scrum master |
| Sponsors | Status email | Weekly | KPIs, risks, decisions needed | PM |
| Steering committee | Meeting | Biweekly | Milestones, budget, escalations | PM |
| All stakeholders | Newsletter | Monthly | Highlights, roadmap | PM |
| End users | Changelog | Per release | What changed, migration steps | Tech writer |
```

```markdown
# Escalation Matrix

| Trigger | Level 1 | Level 2 | Level 3 |
|---------|---------|---------|---------|
| Blocker >1 day | Tech Lead | Engineering Manager | VP Engineering |
| Budget variance >5% | PM | Director | VP/CFO |
| Schedule slip >3 days | PM | Sponsor | Steering committee |
| Security incident | Security Lead | CISO | CEO + Legal |
| Stakeholder conflict | PM | Sponsor | Steering committee |

Escalation rules:
- Always attempt resolution at current level first (24h window)
- Escalation is not failure -- it is proper risk management
- Notify the person being escalated past (no surprises)
- Document the escalation and resolution for future reference
```

## Gotchas

- RACI with multiple "A"s per row means nobody is actually accountable
- Over-communication creates noise fatigue -- stakeholders tune out
- Meeting-heavy cultures use sync for everything; most updates should be async
- Escalation paths without time-bound triggers mean issues fester indefinitely
- Not communicating "no news" -- silence is often interpreted as problems being hidden

## Verification

- Every RACI row has exactly one "A" (accountable)
- Communication cadence matches stakeholder power-interest quadrant
- Escalation criteria are specific and time-bound (not "when appropriate")
- Stakeholders confirm they are receiving the right information at the right frequency
- There is a single, known location for project status (not scattered across tools)
