---
type: subskill
title: "Feature Flags"
---

# Feature Flags

## Flag Types

| Type | Purpose | Lifetime | Owner |
|------|---------|----------|-------|
| Release | Gate incomplete feature | Days-weeks | Dev team |
| Ops | Circuit breaker, kill switch | Permanent (exception) | SRE |
| Experiment | A/B test variant | Experiment duration | Product |
| Permission | Entitlement gate | Permanent (exception) | Product |

## Lifecycle

Create > Target > Ramp > Full Rollout > Cleanup.

1. **Create**: Name follows `team.feature.variant` convention. Register owner + cleanup date.
2. **Target**: Define segments (internal > beta > % rollout > all).
3. **Ramp**: 1% > 5% > 25% > 100%. Monitor error rate, latency, business metrics per stage.
4. **Full Rollout**: Flag evaluates true for all. Code path proven.
5. **Cleanup**: Remove flag checks, delete dead code path, archive flag. Max 2 sprints after full.

## Targeting Rules

- Internal employees first (dogfood).
- Beta segment (opted-in users).
- Percentage ramp (random consistent hashing by user ID).
- Region-based (single region > multi-region).
- Custom attributes (plan tier, account age, etc).

## Kill Switch

Every release flag MUST have instant-off capability. Kill switch = flag evaluates false, no deploy needed. Response time: <30 seconds from decision to effect.

## Naming Convention

```
<team>.<domain>.<feature>[.<variant>]
```
Examples: `payments.checkout.express-flow`, `search.ranking.ml-v2.control`

## Cleanup Automation

- Flag created > cleanup ticket auto-created with due date (creation + 30 days).
- Stale flag alert: flag at 100% for >14 days without cleanup = alert to owner.
- Quarterly flag audit: all flags reviewed, orphaned flags force-archived.

## Anti-Patterns

- **Permanent release flags**: If it's been 100% for 2+ sprints, remove it.
- **No ownership**: Every flag needs a team owner. Orphaned flags get force-archived.
- **Flag spaghetti**: Flags depending on other flags. Max 1 level of flag nesting.
- **Testing without flags**: Test both paths. Flag-off path must remain functional.
- **Flag as config**: Flags are temporary. Long-lived config belongs in config service.

## Verification

- [ ] Flag registered with owner, cleanup date, and type
- [ ] Kill switch tested before ramp begins
- [ ] Both code paths have test coverage
- [ ] Cleanup ticket exists with sprint target
- [ ] No flag nesting beyond 1 level
