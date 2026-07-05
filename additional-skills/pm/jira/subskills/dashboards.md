---
type: subskill
title: "Dashboards"
---

# Dashboards

## Scope

Gadget selection, filter-based charts, audience-specific views, sharing, performance.

## Principles

- One dashboard = one question answered
- Filter-driven (all gadgets backed by saved JQL filters)
- Load <3s (limit gadgets to 6, avoid expensive queries)
- Audience-specific (team vs PM vs stakeholder vs exec)
- Shared with minimal permission (view not edit)
- Refresh cadence matches decision cadence

## Dashboard Recipes

### Team Velocity
Question: "Are we getting faster or slower?"
Gadgets: Velocity Chart, Sprint Burndown, Resolved vs Created (14d), Cycle Time

### Sprint Health
Question: "Will we finish this sprint?"
Gadgets: Sprint Burndown, Remaining by Assignee (pie), Blocked Items (filter), Sprint Scope Change

### Bug Triage
Question: "What needs attention now?"
Gadgets: Open Bugs by Priority (2D filter), Bug Age Distribution, Created vs Resolved (30d), Critical Bugs List

### Release Readiness
Question: "Can we ship?"
Gadgets: Issues by Fix Version + Status, Blocker List, Test Coverage (linked), Release Burndown

### Stakeholder Overview
Question: "How is the project progressing?"
Gadgets: Epic Progress (roadmap), Done This Month (filter), Upcoming Milestones, Risk Items (flagged)

## Gadget Selection Guide

| Need | Gadget |
|------|--------|
| Trend over time | Created vs Resolved |
| Sprint progress | Burndown Chart |
| Distribution | Pie Chart (by status/assignee/priority) |
| Specific list | Filter Results |
| Throughput | Velocity Chart |
| Bottlenecks | Average Age / Time in Status |
| Dependencies | Issue Links filter |

## Sharing Model

| Audience | Access | Content |
|----------|--------|---------|
| Team | Edit (own gadgets) | Operational detail |
| PM | View | Sprint + release health |
| Stakeholders | View | Progress + risks only |
| Exec | View | Portfolio-level, no noise |

## Performance Tips

- Max 6 gadgets per dashboard
- Filters should return <500 results
- Avoid "All Projects" in queries
- Use board-level reports for real-time; dashboards for periodic review
- Cache-friendly: relative dates over absolute

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too many gadgets | Split into multiple focused dashboards |
| Stale filters | Review quarterly, add owner |
| Same dashboard for all audiences | Create per-audience views |
| Absolute dates in filters | Use relative (`-7d`, `-1w`) |
| No clear question | Name dashboard as the question it answers |

## Verification

- Dashboard loads <3s
- Every gadget shows current data (not stale)
- Stated question is answered by scanning gadgets <10s
- Permissions correct (test with non-admin user)
