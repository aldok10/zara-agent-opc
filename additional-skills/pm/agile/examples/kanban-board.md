---
type: example
title: "Kanban Board Example"
---

# Kanban Board Example

## Board Layout

```
| Backlog | Ready (3) | In Progress (4) | Review (2) | Done |
|---------|-----------|-----------------|------------|------|
| 12 items| Item A    | Item D [3d]     | Item F [1d]| Item H|
|         | Item B    | Item E [5d] !!  | Item G [2d]| Item I|
|         | Item C    | Item J [1d]     |            | Item K|
|         |           | Item L [2d]     |            |      |
```

## Column Policies
- **Ready**: Acceptance criteria written, dependencies cleared
- **In Progress**: WIP=4. Dev started. Assignee visible.
- **Review**: WIP=2. PR submitted. Reviewer assigned within 4h.
- **Done**: DoD met. Deployed to staging minimum.

## Flow Metrics (this week)
- Throughput: 5 items/week (4-week avg: 4.5)
- Cycle time P50: 3 days | P85: 6 days | P95: 9 days
- SLE: "85% of items done within 6 days"
- Current WIP: 6 (In Progress: 4, Review: 2)

## Actions from Board
- Item E [5d] exceeds P85 (6d threshold approaching) → flag: "needs pairing or split"
- Review at WIP limit → no new PRs until one clears
- Backlog healthy (12 items, ~2.5 weeks of work ready)

## Expedite Lane (not shown)
- WIP: 1 max. Production incident only. Displaces nothing, gets swarmed.
