---
type: subskill
title: "Status Reporting"
---

# Status Reporting

## Scope

Consistent, honest status communication. Right detail for right audience.

## RAG Definitions

| Color | Meaning | Criteria |
|-------|---------|----------|
| GREEN | On track | Milestones hit, no blockers, within budget |
| AMBER | Issue exists, mitigated | Risk identified, plan in place, needs monitoring |
| RED | Milestone at risk | Blocker active, scope/date/quality trade-off needed |

Rules: Amber must precede Red. Never jump Green->Red without explanation.

## Weekly Template

```
# Week of [date]

## [Initiative A]: [RAG]
SHIPPED: [what delivered, with impact]
NEXT: [what's planned this week]
RISK: [issue + mitigation, or "none"]

## [Initiative B]: [RAG]
SHIPPED: ...
NEXT: ...
RISK: ...

## Decisions Needed
- [decision]: [deadline] - [context link]

## Action Items
- [owner]: [action] by [date]
```

## Monthly Summary Format

```
HEADLINE: [one sentence overall status]
METRICS: [2-3 key numbers vs target]
ACHIEVEMENTS: [outcomes delivered]
MISSES: [what missed] - [why] - [recovery]
NEXT MONTH: [top 2 priorities]
RISKS: [risk]: [likelihood] / [impact] / [mitigation]
```

## Audience Adaptation

| Audience | Content | Cadence |
|----------|---------|---------|
| Exec | Outcomes, metrics, asks | Weekly (brief), Monthly (full) |
| Team | Tasks, blockers, decisions | Daily/weekly standup |
| Stakeholders | Impact, timeline, dependencies | Weekly |
| Customers | Features, dates, value | Milestone-based |

## Escalation Triggers

- Amber >2 weeks without improvement -> escalate
- Any Red -> immediate stakeholder notification
- Dependency blocked >48h -> escalate to dependency owner's manager
- Scope change >20% -> re-baseline with sponsor approval

## Verification

- RAG present on every initiative
- Shipped section mentions outcomes not tasks
- Risk section has mitigation (not just problem)
- Consistent cadence maintained (no gaps)
- No Red without prior Amber in history
