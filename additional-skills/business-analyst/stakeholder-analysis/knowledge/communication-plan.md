---
type: fact
title: "Stakeholder Communication Planning"
---

# Stakeholder Communication Planning

## RACI Matrix

| Role | Definition | Rule |
|------|-----------|------|
| **R** Responsible | Does the work | At least one per task |
| **A** Accountable | Final decision-maker | Exactly one per task |
| **C** Consulted | Input before decision (two-way) | Keep minimal |
| **I** Informed | Told after decision (one-way) | Can be many |

Common mistakes: multiple A per row, too many C (decision paralysis), missing I (surprises).

## Engagement Levels

| Level | Strategy to Move Up |
|-------|-------------------|
| Unaware → Neutral | Brief informational updates, 1:1 intro |
| Resistant → Neutral | Understand concerns, address risks, involve in decisions |
| Neutral → Supportive | Show value, invite to demos, celebrate wins |
| Supportive → Champion | Give ownership, public credit, involve in advocacy |

## Communication Plan Template

| Stakeholder | Need | Format | Frequency | Channel |
|-------------|------|--------|-----------|---------|
| Exec sponsor | Progress, risks, decisions | 1-pager | Bi-weekly | Email + 15min sync |
| Eng team | Sprint goals, blockers | Standup + review | Daily/biweekly | Slack + meeting |
| End users | Releases, known issues | Release notes | Per release | In-app + email |
| Partner teams | Integration timelines | Technical brief | Monthly | Wiki + sync |

## Escalation Paths

### When to Escalate
- Decision blocked >2 business days
- Scope change impacting timeline >20%
- Resource conflict between teams
- Stakeholder actively blocking agreed work

### Ladder
```
L1: Working team (same day)
L2: Direct managers (within 48h)
L3: Director/VP (within 1 week)
L4: Executive forced decision
```

### Message Template
```
Subject: [ESCALATION] Decision needed: [topic]
Context: [1-2 sentences]
Options: A) [option+impact]  B) [option+impact]
Decision needed by: [date]
Default if no decision: [action]
```

## Tailoring by Audience

- **Executives**: lead with outcome, one page max, clear ask, red/yellow/green status
- **Technical teams**: context + constraints, ADR/RFC format, skip business justification
- **Business stakeholders**: user impact, demo/screenshot, skip implementation details

## Meeting Cadence

| Type | Purpose | Frequency | Duration |
|------|---------|-----------|----------|
| Steering | Strategy, budget | Monthly | 60min |
| Sprint review | Demo, feedback | Bi-weekly | 45min |
| 1:1 sponsor | Relationship | Weekly | 30min |
| Cross-team sync | Dependencies | Weekly | 30min |

Rules: agenda 24h before, decisions documented within 24h, cancel if no decisions needed.
