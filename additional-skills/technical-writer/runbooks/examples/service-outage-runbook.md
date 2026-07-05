---
type: example
title: "Order Service: Database Connection Pool Exhaustion"
---

# Order Service: Database Connection Pool Exhaustion

**Owner:** Backend Platform Team
**Last reviewed:** 2026-06-01
**Severity:** P1 (customer-impacting -- order creation fails)
**Estimated resolution time:** 10-30 minutes
**Alert:** `order-service-db-pool-exhausted`

## Scope

This runbook covers connection pool exhaustion in the Order Service's PostgreSQL connection pool. It does NOT cover general PostgreSQL performance issues, disk space, or replication lag (see separate runbooks).

## Symptoms / Trigger

- Alert `order-service-db-pool-exhausted` fires (pool utilization >90% for 5 minutes)
- Customers see "Unable to process order" errors (HTTP 503)
- Grafana: Order Service latency p99 >5s, error rate >5%
- Logs show: `ERROR: connection pool timeout - no available connections`

## Prerequisites

- `kubectl` configured for the production cluster
- Access to Grafana dashboards (bookmark: `https://grafana.internal/d/order-service`)
- Access to AWS RDS console for `prod-orders-primary`
- PagerDuty responder acknowledged

## Diagnosis

### Step 1: Confirm pool exhaustion

```bash
kubectl exec -n orders deploy/order-service -- curl -s localhost:8080/debug/pool | jq
```

**Expected result:** JSON showing `active_connections` near `max_pool_size`

### Step 2: Identify the cause

Check query duration distribution:

```bash
kubectl logs -n orders deploy/order-service --since=10m | grep "slow_query" | head -20
```

- **Long-running queries present (>5s):** Go to "Slow Query Mitigation"
- **No slow queries, but high connection count:** Go to "Connection Leak Mitigation"
- **Sudden traffic spike visible in Grafana:** Go to "Traffic Spike Mitigation"

## Slow Query Mitigation

### Step 3: Identify the slow queries

```bash
kubectl exec -n orders deploy/order-service -- psql ${DATABASE_URL} -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   AND now() - pg_stat_activity.query_start > interval '5 seconds'
   ORDER BY duration DESC LIMIT 10;"
```

**Expected result:** List of long-running queries with PIDs

### Step 4: Terminate long-running queries

```bash
kubectl exec -n orders deploy/order-service -- psql ${DATABASE_URL} -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state != 'idle'
   AND now() - pg_stat_activity.query_start > interval '30 seconds'
   AND query NOT LIKE '%pg_stat_activity%';"
```

**Expected result:** Queries terminated, pool connections freed
**If this fails:** Proceed to Step 7 (Emergency: Restart Pods)
**Estimated time:** 2 minutes

### Step 5: Verify recovery

Wait 2 minutes, then check pool utilization:

```bash
kubectl exec -n orders deploy/order-service -- curl -s localhost:8080/debug/pool | jq '.utilization_percent'
```

**Expected result:** Utilization drops below 70%
**If still above 90%:** Proceed to Step 7 (Emergency: Restart Pods)

## Connection Leak Mitigation

### Step 6: Rolling restart with leak detection

```bash
kubectl rollout restart -n orders deploy/order-service
kubectl rollout status -n orders deploy/order-service --timeout=300s
```

**Expected result:** All pods restart; pool connections reset
**If this fails:** Check if pods are failing health checks (OOMKilled, CrashLoopBackOff)
**Estimated time:** 5 minutes

## Traffic Spike Mitigation

### Step 6b: Scale the service

```bash
kubectl scale -n orders deploy/order-service --replicas=8
```

**Expected result:** Additional pods distribute the connection load
**If this fails:** Check resource quotas in namespace
**Estimated time:** 3 minutes

Note: Also increase RDS max connections if sustained:
```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name prod-orders \
  --parameters "ParameterName=max_connections,ParameterValue=400,ApplyMethod=immediate"
```

## Emergency: Restart Pods

### Step 7: Full restart (last resort)

This will cause brief service interruption (30-60 seconds with rolling restart).

```bash
kubectl rollout restart -n orders deploy/order-service
kubectl rollout status -n orders deploy/order-service --timeout=300s
```

**Expected result:** New pods come up with fresh connection pools
**If pods fail to start:** Escalate immediately (see Escalation below)
**Estimated time:** 3-5 minutes

## Verification

- [ ] Alert `order-service-db-pool-exhausted` clears
- [ ] Pool utilization below 70% on Grafana
- [ ] Order creation success rate >99% for 10 minutes
- [ ] No error spikes in Datadog logs
- [ ] Test order: `curl -X POST https://api.example.com/orders -d '{"test": true}'` returns 201

## Rollback

- If scaling was applied: `kubectl scale -n orders deploy/order-service --replicas=4`
- If RDS params changed: revert `max_connections` to 200
- If feature flag was toggled: re-enable via feature flag dashboard

## Escalation

**When to escalate:**
- After 15 minutes without pool recovery
- If pods are in CrashLoopBackOff after restart
- If RDS instance itself is unresponsive

| Role | Contact | Channel |
|------|---------|---------|
| Database on-call | @platform-oncall | #platform-incidents |
| Order Service owner | @orders-team-lead | #orders-team |
| Engineering VP | PagerDuty escalation | Automatic after 30 min P1 |

**Provide when escalating:**
- Timeline of actions taken
- Current pool metrics screenshot
- RDS performance insights link
- Customer impact estimate (orders/minute failing)

## Communication

**Status page update (if >5 minutes customer impact):**
```
Order Processing: Degraded Performance
Some customers may experience delays or errors when placing orders.
Our team is actively working to resolve this. Next update in 15 minutes.
```

**All-clear:**
```
Order Processing: Operational
The issue causing order processing delays has been resolved.
All systems are operating normally. Orders placed during the
incident window have been processed.
```

## Post-Incident

- [ ] Create retrospective in Incident.io
- [ ] Preserve slow query logs: `kubectl logs -n orders deploy/order-service --since=1h > /tmp/incident-logs.txt`
- [ ] Screenshot Grafana dashboards for incident timeline
- [ ] Schedule retrospective within 48 hours
- [ ] If caused by slow queries: create ticket for query optimization
- [ ] If caused by leak: create ticket for connection pool audit
