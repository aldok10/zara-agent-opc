---
type: fact
title: "Observability During Chaos Experiments"
---

# Observability During Chaos Experiments

## Why Observability Matters in Chaos

Chaos experiments without proper observability are just breaking things. The goal is to verify hypotheses through measurement. You need to see:
- Was the fault actually injected?
- Did the system respond as expected?
- Were there unexpected side effects?

## Three Pillars for Chaos

### Metrics (What happened)
```
┌─────────────────────────────────────┐
│ Experiment Timeline                  │
│                                      │
│  Baseline → Inject → Observe → End  │
│  [5 min]    [t=0]    [duration]     │
│                                      │
│  Compare: before vs during vs after  │
└─────────────────────────────────────┘
```

**Key metrics to capture:**
- Request rate (throughput)
- Error rate (by type: 4xx, 5xx, timeout)
- Latency percentiles (p50, p95, p99)
- Resource utilization (CPU, memory, connections)
- Queue depth / backlog
- Circuit breaker state changes
- Retry counts

### Logs (Why it happened)
- Error messages during the experiment
- Retry/fallback activation logs
- Circuit breaker trips
- Connection errors and reconnection attempts
- Timeout logs with correlation IDs

### Traces (How it propagated)
- End-to-end request flow during fault
- Where requests fail in the call chain
- Latency contribution per service hop
- Retry amplification visibility

## Dashboard Template for Experiments

### Before the Experiment
```promql
# Establish baseline (capture 5-15 min before)
# Request rate
rate(http_requests_total{service="target"}[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Saturation
container_memory_usage_bytes / container_spec_memory_limit_bytes
```

### During the Experiment
```promql
# Same queries, compare against baseline
# Add fault-specific metrics:

# Circuit breaker state
circuit_breaker_state{service="payment", target="database"}

# Retry count (detect amplification)
sum(rate(http_client_retries_total[1m])) by (service)

# Queue depth (detect backpressure)
queue_messages_pending{queue="orders"}

# Connection pool usage
db_connections_active / db_connections_max
```

### After the Experiment (Recovery)
```promql
# Time to recovery (when metrics return to baseline)
# Look for:
# - Metric stabilization
# - Queue drain completion
# - Error rate return to baseline
# - No lingering degradation
```

## Alerting During Chaos

### Suppress Known Alerts
```yaml
# Example: AlertManager silence during experiment
silence:
  matchers:
    - name: experiment_id
      value: "chaos-2024-01-15-payment"
  startsAt: "2024-01-15T14:00:00Z"
  endsAt: "2024-01-15T14:30:00Z"
  comment: "Chaos experiment: payment service partition"
```

### Verify Expected Alerts Fire
Part of the experiment: did the system correctly detect the fault?
- PagerDuty/OpsGenie incident created within SLA?
- Alert includes actionable information?
- Runbook linked and correct?

## SLO Impact Tracking

### Error Budget Consumption
```promql
# How much error budget did this experiment consume?
# Calculate: (errors_during_experiment / total_requests_during) - baseline_error_rate

# Pre-approve budget: "This experiment may consume up to 5% of monthly error budget"
```

### SLO Burn Rate
```promql
# Watch burn rate during experiment
# If burn rate exceeds 10x normal → abort threshold
1 - (
  sum(rate(http_requests_total{status!~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
) / (1 - 0.999)  # Replace 0.999 with SLO target
```

## Tools Integration

### Grafana Annotations
```typescript
// Mark experiment start/end on dashboards
await grafana.createAnnotation({
  dashboardId: 42,
  time: Date.now(),
  tags: ['chaos', 'payment-partition'],
  text: 'Chaos experiment started: payment service network partition'
});
```

### Distributed Tracing Tags
```typescript
// Tag traces during experiment for filtering
span.setAttribute('chaos.experiment_id', 'exp-2024-01-15');
span.setAttribute('chaos.fault_type', 'network_partition');
span.setAttribute('chaos.target', 'payment-service');
```

### Custom Events
```typescript
// Emit experiment lifecycle events
await monitoring.emitEvent({
  type: 'chaos.experiment.started',
  experiment: 'payment-partition',
  blast_radius: 'single-instance',
  expected_duration: '60s',
  abort_threshold: { error_rate: 0.05 }
});
```

## Post-Experiment Analysis

### Report Template
```markdown
## Chaos Experiment Report

### Experiment: [Name]
- Date: [timestamp]
- Duration: [actual duration]
- Fault: [what was injected]
- Target: [service/resource]

### Steady State Comparison
| Metric | Before | During | After | Recovery Time |
|--------|--------|--------|-------|---------------|
| Error rate | 0.01% | X% | 0.01% | Ys |
| P95 latency | 150ms | Xms | 155ms | Ys |

### Hypothesis Result: CONFIRMED / REFUTED

### Findings
1. [What worked as expected]
2. [What didn't work]
3. [Unexpected observations]

### Action Items
- [ ] [Fix: specific remediation]
- [ ] [Improve: monitoring gap found]
- [ ] [Automate: manual step that should be automated]
```

## Common Observability Gaps Found by Chaos

1. No alerting on connection pool exhaustion
2. Retry storms not visible (no retry metrics)
3. Cascading failure not traceable (missing trace context propagation)
4. Recovery time unmeasured (no SLO on recovery)
5. Downstream impact invisible (no dependency health tracking)
6. Queue depth alerts set too high (data loss before alert)
