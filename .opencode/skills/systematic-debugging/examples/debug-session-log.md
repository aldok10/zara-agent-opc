# Debugging Session Log: Intermittent 503s on Payment Service

## Phase 1: Observe

**Symptom**: Payment service returns 503 (Service Unavailable) for ~2% of requests
between 14:00-14:30 UTC daily. No alerts firing. Customer complaints increasing.

**Initial data gathered**:
- Error rate: 2.1% during window, <0.01% outside window
- Affected endpoints: all (not specific to one route)
- No recent deployments (last deploy: 3 days ago)
- Health checks pass throughout the incident window
- No CPU/memory pressure visible on dashboards

## Phase 2: Orient

**Hypotheses** (ranked by likelihood):
1. Connection pool exhaustion to downstream dependency
2. Kubernetes pod autoscaler thrashing (scale-down then immediate scale-up)
3. Garbage collection pause in JVM-based dependency
4. Database connection timeout from daily maintenance job

**Key question**: Why 14:00-14:30 specifically? What runs on that schedule?

**Discovery**: Cron job `analytics-daily-export` runs at 14:00 UTC.
It queries the same Postgres instance used by the payment service.

## Phase 3: Diagnose

**Investigation steps**:

```bash
# Check connection pool metrics during incident window
kubectl exec -it payment-svc-7f8b9c -- curl localhost:9090/metrics | grep pool

# Result: pgpool_active_connections: 48/50 (near max)
# Outside window: pgpool_active_connections: 12/50
```

```sql
-- Check active queries during window (ran next day at 14:05)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND duration > interval '5 seconds';

-- Found: analytics export running full table scan, holding 35 connections
```

**Root cause confirmed**: The analytics export job opens 35+ long-running
connections to the shared Postgres instance. Payment service pool (max 50)
cannot acquire connections fast enough, causing timeouts that surface as 503s.

## Phase 4: Fix

**Immediate mitigation** (applied same day):
- Reduced analytics job parallelism from 8 to 2 workers
- Added connection timeout + retry with backoff to payment service

**Permanent fix** (next sprint):
- Moved analytics export to read replica
- Added PgBouncer between services and Postgres for connection multiplexing
- Added alert on `pgpool_waiting_connections > 5 for 1m`

**Verification**:
- Monitored next 3 days at 14:00 -- no 503s, pool utilization peaked at 18/50
- Load tested payment service with reduced pool (max 20) -- graceful degradation confirmed

## Lessons

- Health checks passing does not mean the service is healthy for real traffic
- Shared database resources need per-tenant/per-service connection limits
- Scheduled jobs that touch production data need resource budgets
- The "2% error rate" was actually 100% failure for requests during pool exhaustion bursts
