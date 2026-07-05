---
type: example
title: "Database Failover Runbook"
---

# Database Failover Runbook

## Context
When the primary database becomes unresponsive and automated failover hasn't triggered (or you need manual failover for planned maintenance). This runbook covers both RDS Multi-AZ automatic failover verification and manual promotion of a read replica.

## Code/Template

```markdown
# Runbook: PostgreSQL Database Failover

## Metadata
| Field | Value |
|-------|-------|
| Severity | P1 - Data layer unavailable |
| On-call | database-oncall@company.com |
| Last tested | 2024-02-20 (quarterly failover drill) |
| RTO | < 5 minutes (automated), < 15 minutes (manual) |
| RPO | 0 (synchronous replication) |

## Symptoms
- Application returning 500 errors with "connection refused" or "timeout"
- CloudWatch: `DatabaseConnections` drops to 0
- RDS Events: "Multi-AZ failover started" or no events (stuck primary)
- PgBouncer logs: "server conn crashed"

## Pre-Flight Checks (before any action)

```bash
# 1. Confirm the database is actually down (not a network issue)
pg_isready -h prod-db.cluster-xyz.us-east-1.rds.amazonaws.com -p 5432
# Expected if down: "no response"

# 2. Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier prod-db-primary \
  --query 'DBInstances[0].{Status:DBInstanceStatus,AZ:AvailabilityZone,MultiAZ:MultiAZ}'

# 3. Check recent RDS events
aws rds describe-events \
  --source-identifier prod-db-primary \
  --source-type db-instance \
  --duration 30 \
  --query 'Events[].{Time:Date,Message:Message}'

# 4. Verify replica health (if manual failover needed)
aws rds describe-db-instances \
  --db-instance-identifier prod-db-replica \
  --query 'DBInstances[0].{Status:DBInstanceStatus,ReplicaLag:StatusInfos}'
```

## Scenario A: RDS Multi-AZ Automatic Failover

RDS handles this automatically. Your job is to verify and mitigate application impact.

```bash
# 1. Confirm failover completed
aws rds describe-events \
  --source-identifier prod-db-primary \
  --source-type db-instance \
  --duration 10 \
  --query 'Events[?contains(Message, `completed`)]'

# 2. Verify new primary is accepting connections
pg_isready -h prod-db.cluster-xyz.us-east-1.rds.amazonaws.com -p 5432

# 3. Check application recovery
curl -s https://api.company.com/health | jq '.database'
# Expected: {"status": "connected", "latency_ms": ...}

# 4. If connections are stale, restart application pods
kubectl rollout restart deployment/api-server -n production

# 5. Verify replication to new standby is established
aws rds describe-db-instances \
  --db-instance-identifier prod-db-primary \
  --query 'DBInstances[0].StatusInfos'
```

## Scenario B: Manual Replica Promotion

When automated failover doesn't trigger or you have Aurora with read replicas.

```bash
# 1. STOP writes to prevent split-brain
# Scale API to 0 or enable maintenance mode
kubectl scale deployment/api-server -n production --replicas=0
echo "$(date): Writes stopped. Beginning manual failover." >> /tmp/failover.log

# 2. Check replica lag (MUST be 0 before promoting)
aws rds describe-db-instances \
  --db-instance-identifier prod-db-replica \
  --query 'DBInstances[0].StatusInfos[?StatusType==`read replication`].Normal'
# MUST return true. If false, you WILL lose data.

# 3. Promote the replica
aws rds promote-read-replica \
  --db-instance-identifier prod-db-replica \
  --backup-retention-period 7

# 4. Wait for promotion to complete (typically 2-5 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier prod-db-replica
echo "$(date): Replica promoted successfully." >> /tmp/failover.log

# 5. Update application connection string
# Option A: Update DNS (preferred, no app restart needed)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "db.internal.company.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "prod-db-replica.xyz.us-east-1.rds.amazonaws.com"}]
      }
    }]
  }'

# Option B: Update env var and restart pods
kubectl set env deployment/api-server \
  DATABASE_URL="postgresql://user@prod-db-replica.xyz.us-east-1.rds.amazonaws.com:5432/prod" \
  -n production

# 6. Scale application back up
kubectl scale deployment/api-server -n production --replicas=6

# 7. Verify connections
sleep 30
curl -s https://api.company.com/health | jq '.database'
```

## Post-Failover Checklist

- [ ] Verify application health (`/health` endpoint green)
- [ ] Check error rates returned to baseline (Datadog/Grafana)
- [ ] Confirm new replication target is set up (no single point of failure)
- [ ] Update monitoring to point to new primary
- [ ] Notify team in #incidents channel with timeline
- [ ] Create new read replica from promoted instance
- [ ] Schedule post-mortem if unplanned failover
- [ ] Update this runbook if any steps were incorrect

## Rollback (if promotion causes issues)

There is NO automatic rollback after replica promotion. If the promoted replica
has issues:

1. Restore from most recent automated snapshot
2. Point application to restored instance
3. Accept data loss since last snapshot (typically < 5 minutes)

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier prod-db-restored \
  --db-snapshot-identifier rds:prod-db-primary-2024-03-15-03-00 \
  --db-instance-class db.r6g.xlarge \
  --multi-az
```

## Quarterly Drill Procedure

Test this runbook every quarter in staging:
1. Trigger failover: `aws rds reboot-db-instance --db-instance-identifier staging-db --force-failover`
2. Time the recovery
3. Document any deviations from runbook
4. Update runbook with lessons learned
```

## Key Points
- Always check replica lag before promoting—promoting a lagging replica means data loss equal to the lag amount
- Stop application writes BEFORE promoting to prevent split-brain (both old primary and new primary accepting writes)
- Test this runbook quarterly with a real failover drill; an untested runbook is a liability, not an asset
