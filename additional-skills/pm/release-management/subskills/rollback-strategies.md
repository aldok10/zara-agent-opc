# Rollback Strategies

## Decision Tree

```
Issue detected in production
├── Feature flag exists?
│   ├── YES → Turn off flag (seconds). Monitor. Done.
│   └── NO → Can redeploy previous version?
│       ├── YES → Rollback deployment (<5 min target)
│       └── NO → Forward-fix or revert commit + deploy
│           └── Database involved?
│               ├── NO → Revert commit, deploy
│               └── YES → Assess: expand-contract safe? 
│                   ├── YES → Forward-fix with migration
│                   └── NO → Incident escalation
```

## Strategy Comparison

| Strategy | Speed | Risk | When |
|----------|-------|------|------|
| Flag off | Seconds | Lowest | Flag exists, no data corruption |
| Redeploy previous | 2-5 min | Low | Stateless service, no schema change |
| Revert commit + deploy | 5-15 min | Medium | No flag, clean git history |
| Forward-fix | 15-60 min | Higher | Rollback impossible or riskier |

## Forward-Fix vs Rollback Criteria

**Rollback when**: Impact is high, fix is uncertain, root cause unknown, data integrity at risk.
**Forward-fix when**: Issue is well-understood, fix is simple and tested, rollback would cause more disruption (e.g., data migration already applied).

## Database Considerations

- Never deploy destructive migrations (DROP, RENAME) in same release as code.
- Use expand-contract: add new > migrate data > update code > remove old.
- Rollback-safe migrations: additive only (ADD COLUMN, CREATE TABLE).
- If migration already ran and can't reverse: forward-fix is the only option.

## Communication During Rollback

1. Declare incident in #incidents channel immediately.
2. Assign rollback owner (person executing) and comms owner (person updating stakeholders).
3. Status updates every 5 minutes during active rollback.
4. Post-mortem within 48 hours. Blameless.

## Targets

| Metric | Target |
|--------|--------|
| Time to detect | <5 min (alerting) |
| Time to decide (flag off / rollback) | <2 min |
| Time to execute rollback | <5 min |
| MTTR total | <15 min |

## Pre-Release Requirements

Before any release ships:
- [ ] Rollback owner assigned (name, not team)
- [ ] Rollback method documented (flag off / redeploy / revert)
- [ ] Rollback tested in staging (at least once per quarter for deployment rollbacks)
- [ ] Database migration is additive-only or has reverse migration script
- [ ] Monitoring dashboards open during deploy with baseline captured

## Verification

- [ ] Rollback plan exists before deploy
- [ ] Rollback owner knows they're the owner
- [ ] Flag-off path tested
- [ ] MTTR <15 min for last 3 rollbacks
- [ ] Post-mortem completed within 48h of any rollback
