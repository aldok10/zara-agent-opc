---
type: example
title: "Cycle Planning Example"
---

# Cycle Planning Example

## Context

Team: Platform (4 engineers). Cycle: 2 weeks (10 working days). Focus factor: 0.7.

## Capacity

```
Available = 4 engineers × 10 days × 0.7 = 28 eng-days
Buffer (10%) = 2.8 eng-days
Usable = 25 eng-days
```

## Last Cycle Review

- Velocity: 23 eng-days completed. Carry-over: 3 items (12%). Acceptable.
- Blocker: infra outage ate 2 days unplanned.

## Selected Scope

| Issue | Priority | Estimate | Assignee |
|-------|----------|----------|----------|
| Auth service migration | High | 8d | @alice + @bob |
| Webhook retry logic | High | 5d | @carol |
| Rate limiter fix | Urgent | 3d | @dave |
| API docs update | Medium | 2d | @alice |
| Monitoring dashboards | Medium | 3d | @bob |
| Tech debt: remove deprecated endpoints | Low | 4d | @carol + @dave |

**Total: 25 eng-days. At capacity. Scope locked.**

## Cooldown (2 days after cycle)

- Retro, exploration, documentation catch-up.
