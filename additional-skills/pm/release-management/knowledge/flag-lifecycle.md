# Flag Lifecycle

## Stages

| Stage | State | Actions | Duration |
|-------|-------|---------|----------|
| Create | Off for all | Register flag, assign owner, set cleanup date | Day 0 |
| Target | On for internal | Enable for employees, verify functionality | 1-3 days |
| Ramp | On for % | 1% > 5% > 25% > 100%, monitor per stage | 1-2 weeks |
| Full | On for all | Flag evaluates true universally | Max 2 sprints |
| Cleanup | Removed | Delete flag checks, remove dead code, archive | Sprint after full |

## Ownership Rules

- Every flag has exactly ONE team owner (not individual — survives attrition).
- Owner responsible for: ramp decisions, monitoring, cleanup.
- Transfer ownership explicitly in flag system if team changes.
- Orphaned flags (owner team dissolved): platform team inherits, archives within 1 sprint.

## Cleanup Automation Triggers

| Trigger | Action |
|---------|--------|
| Flag at 100% for 14+ days | Alert owner: "Schedule cleanup" |
| Flag at 100% for 30+ days | Alert owner's manager: "Stale flag" |
| Flag at 100% for 60+ days | Auto-create P2 ticket, flag marked stale |
| No evaluation in 30 days | Alert owner: "Flag unused, archive?" |
| Owner team deleted | Transfer to platform team + archive alert |

## Stale Flag Detection

Stale = flag at 100% without cleanup activity for >14 days OR flag with zero evaluations in 30 days.

Query weekly: `flags WHERE (percentage=100 AND days_since_full>14 AND no_cleanup_ticket) OR (last_evaluated > 30_days_ago)`.

## Formal State Machine

```
CREATED → TARGETING → RAMPING → FULL_ROLLOUT → CLEANUP → ARCHIVED
   ↓          ↓          ↓           ↓
 (kill)    (kill)    (rollback)   (rollback)
```

Each transition requires: metric check pass, owner approval, state logged.

## Cautionary: Knight Capital ($460M Loss, 2012)

- Knight Capital lost $460M when a deployment repurposed an old feature flag name, accidentally reactivating dead code (SMARS Power Peg system). Root cause: dead code + repurposed flag, not merely a stale flag.
- Unintended algo executed 4M trades in 45 minutes
- **Lesson**: cleanup is not optional. Stale flags are live production risk.

## Role-Based Access

| Role | Can Create | Can Ramp | Can Kill | Can Cleanup | Can Archive |
|------|-----------|----------|----------|-------------|-------------|
| Developer | Yes | No | Emergency only | Yes (own flags) | No |
| Team Lead | Yes | Yes | Yes | Yes | Yes |
| Platform | Yes | Yes | Yes | Yes | Yes (bulk) |
| PM | No | Request only | No | No | No |

## CI/CD Flag Testing

- Test BOTH flag states (on/off) in CI pipeline
- Mock flag service in integration tests—never call live
- Pre-deploy check: new code paths reachable under both states
- Canary failures auto-rollback flag to previous state

## Metrics

- Flag count per team (target: <10 active release flags).
- Average flag lifetime (target: <30 days for release flags).
- Stale flag count (target: 0).
- Cleanup completion rate (target: >90% promptly after full rollout, e.g., within 2-4 sprints).
