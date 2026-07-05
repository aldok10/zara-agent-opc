# Cycles & Projects

## Purpose

Plan cycles (sprints) and manage projects (epics) with discipline. Protect scope, respect capacity.

## Cycle Planning Template

1. **Review last cycle**: carry-over %, velocity, blockers.
2. **Capacity check**: team size × days × 0.7 (meetings/interrupts).
3. **Pull from backlog**: Urgent > High > Medium. Stop at capacity.
4. **Scope lock**: after planning meeting, no additions without swap.
5. **Assign all**: every issue has owner before cycle starts.

## Capacity Calculation

```
Available points = (engineers × days × focus_factor)
focus_factor = 0.7 (standard) | 0.5 (heavy meeting week) | 0.8 (no meetings)
Buffer = 10% for unplanned urgent work
Usable capacity = Available points × 0.9
```

## Scope Lock Rules

- After cycle start: new Urgent only via swap (something else deferred).
- No scope additions after day 3 of cycle.
- If Urgent arrives: swap lowest-priority item out, document reason.
- Scope changes tracked for retro.

## Cooldown Period

- 1-2 days between cycles. Non-negotiable.
- Use for: retro, tech debt, exploration, documentation.
- No feature work during cooldown.

## Project (Epic) Management

- Project = multi-cycle initiative with clear outcome.
- Every project has: owner, target date, milestones, confidence level.
- Milestones = checkpoints, not mini-projects.
- Update project status weekly (On Track / At Risk / Off Track).

## Rollover Handling

- Carry-over >20% = estimation problem. Address in retro.
- Rolled issues get re-prioritized (not auto-included next cycle).
- 3 consecutive rollovers on same issue = descope or break down.

## Anti-Patterns

- Scope changes after cycle start without swap
- No cooldown between cycles (leads to burnout)
- Carry-over >20% without retro action
- Projects without target date or milestones
- Cycles planned at >100% capacity

## Verification

- [ ] Cycle starts at <=100% capacity
- [ ] All issues assigned before cycle start
- [ ] Cooldown scheduled between cycles
- [ ] Projects have weekly status update
- [ ] Carry-over tracked and actioned
