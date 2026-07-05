---
type: tool
title: "Load Test Scenario Design"
---

# Load Test Scenario Design

## Purpose
Design a load test scenario for a given system, including profile, scripts, thresholds, and monitoring plan.

## Inputs Required
- System under test (what service/endpoint)
- Expected traffic patterns (daily users, peak hours)
- SLOs (response time, error rate, availability)
- Infrastructure (cloud provider, auto-scaling config)
- Current known bottlenecks (if any)
- Purpose (capacity planning, SLO verification, event prep)

## Design Steps

### 1. Define Objectives

```markdown
## Test Objectives
- [ ] Verify SLO compliance at expected load
- [ ] Find breaking point / max capacity
- [ ] Validate auto-scaling behavior
- [ ] Detect memory leaks / resource exhaustion
- [ ] Test specific scenario: [description]

## Success Criteria
- p95 response time < [X]ms at [Y] RPS
- Error rate < [Z]% sustained
- Auto-scale triggers within [N] seconds
- No memory growth over [duration]
```

### 2. Calculate Load Targets

```markdown
## Traffic Model
- Daily active users: [N]
- Average session actions: [X]
- Peak-to-average ratio: [Y]x

## Derived Targets
- Average RPS: [calculated]
- Peak RPS: [calculated]
- Test ceiling (2x peak): [calculated]
- VUs needed: [RPS × avg_response_time_seconds]
```

### 3. Select Test Profile

Based on objective:
- SLO verification → Average Load (30 min)
- Breaking point → Stress/Breakpoint (ramp to failure)
- Event prep → Spike (simulate the event pattern)
- Reliability → Soak (4-8 hours)

### 4. Design User Flows

```markdown
## Virtual User Scenarios

### Scenario A: Browse (60% of traffic)
1. GET /homepage (think: 3s)
2. GET /products?category=X (think: 5s)
3. GET /products/:id (think: 4s)

### Scenario B: Purchase (30% of traffic)
1. POST /cart/add (think: 2s)
2. GET /checkout (think: 10s)
3. POST /checkout/confirm

### Scenario C: Account (10% of traffic)
1. GET /account/orders
2. GET /account/orders/:id
```

### 5. Define Thresholds

```markdown
## Pass/Fail Criteria

| Metric | Threshold | Action on Fail |
|--------|-----------|---------------|
| p95 response time | < 200ms | FAIL test |
| p99 response time | < 500ms | WARN |
| Error rate | < 1% | FAIL test |
| Throughput | > [min RPS] | FAIL test |
```

### 6. Monitoring Plan

```markdown
## What to Monitor During Test

### Application Metrics (k6 output)
- Request rate, duration, errors
- Custom business metrics

### Infrastructure (Grafana/CloudWatch)
- CPU, memory per service instance
- Auto-scaling events
- Database connections / query time
- Queue depth
- Network throughput

### Alerts to Watch
- [ ] PagerDuty firing?
- [ ] Auto-scaling triggered?
- [ ] Circuit breakers tripping?
```

### 7. Output

```markdown
## Load Test Plan: [System Name]

### Objective
[1 sentence]

### Profile: [type]
- Duration: [time]
- Peak load: [RPS / VUs]
- Ramp pattern: [description]

### Script Files
- `scripts/[name].js` — main test script
- `data/[name].csv` — test data
- `thresholds.json` — pass/fail criteria

### k6 Command
```bash
k6 run --out influxdb=http://monitoring:8086/k6 \
  -e API_URL=https://staging.example.com \
  -e TOKEN=$TEST_TOKEN \
  scripts/[name].js
```

### Pre-Test Checklist
- [ ] Staging environment matches production config
- [ ] Test data seeded
- [ ] Monitoring dashboards open
- [ ] Team notified
- [ ] Baseline metrics captured

### Post-Test Deliverables
- [ ] Summary report with pass/fail
- [ ] Grafana screenshot at peak load
- [ ] Bottleneck identification (if any)
- [ ] Recommendations
```
