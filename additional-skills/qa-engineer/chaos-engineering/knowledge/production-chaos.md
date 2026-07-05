---
type: fact
title: "Production Chaos Safely"
---

# Production Chaos Safely

## Core Principle

Production chaos experiments validate real system behavior under failure. The goal is learning, not breaking things. Every experiment must be designed to minimize customer impact while maximizing insight.

## Canary Experiment Pattern

### Progressive Blast Radius

```
Stage 1: Single instance, internal traffic only (0% customer impact)
Stage 2: Single AZ, 1% traffic (minimal exposure)
Stage 3: Multi-AZ, 5% traffic (validate at scale)
Stage 4: Full region, normal traffic (confidence validated)
```

### Canary Rules
- Start with the smallest possible scope
- Measure baseline metrics BEFORE injection
- Define success/failure thresholds upfront
- Automate rollback at each stage gate
- Never skip stages, even for "simple" experiments

## Abort Conditions

Every experiment MUST define halt criteria before execution.

### Automatic Abort Triggers
- Error rate exceeds baseline + threshold (e.g., >2% increase)
- Latency p99 exceeds SLO
- Customer-facing alerts fire
- Dependent service reports degradation
- Experiment duration exceeds planned window

### Manual Abort Authority
- Any on-call engineer can halt without approval
- Experiment owner monitors full duration
- Communication channel open with incident responders

### Abort Mechanism
```yaml
experiment:
  name: "payment-service-latency"
  abort_conditions:
    - metric: error_rate
      threshold: ">0.5%"
      action: immediate_rollback
    - metric: p99_latency
      threshold: ">2000ms"
      action: immediate_rollback
    - metric: customer_complaints
      threshold: ">0"
      action: pause_and_investigate
  rollback:
    type: automatic
    max_time_to_rollback: 30s
```

## Customer-Aware Experimentation

### Traffic Segmentation
- Exclude VIP/enterprise customers from blast radius
- Use feature flags to route experiment traffic
- Identify revenue-critical paths  -  avoid during peak hours
- Consider geographic impact (don't chaos-test during business hours in affected region)

### Customer Impact Budget
- Define maximum acceptable impact per experiment
- Track cumulative impact across experiments per week
- Zero tolerance for data loss or corruption experiments in prod
- Financial transactions: synthetic-only until pattern validated in staging

### Communication Protocol
1. Pre-experiment: notify on-call, post in incident channel
2. During: real-time dashboard shared with stakeholders
3. Post-experiment: findings shared within 24h
4. If customer impact detected: incident process triggers immediately

## Progressive Rollout for Chaos

### Confidence Levels

| Level | Environment | Traffic | Duration | Approval |
|---|---|---|---|---|
| 1 | Staging | Synthetic | 30min | Team |
| 2 | Prod canary | Internal | 1h | Team lead |
| 3 | Prod partial | 1-5% real | 2h | Engineering manager |
| 4 | Prod full | 100% | 4h+ | VP Eng + SRE lead |

### Graduation Criteria
- Level N must pass 3 consecutive times before Level N+1
- Each level requires documented hypothesis and outcome
- Findings from lower levels incorporated into higher level design

## Experiment Types by Risk

### Low Risk (start here)
- DNS resolution delays (adds latency, no data impact)
- Connection pool exhaustion to non-critical service
- Clock skew injection (NTP drift)
- Disk space pressure on log volumes

### Medium Risk
- Single node failure in replicated service
- Network partition between service and cache layer
- CPU pressure on specific instance
- Certificate expiry simulation

### High Risk (requires Level 3+ confidence)
- Database failover during writes
- Complete AZ evacuation
- Message queue backpressure
- Authentication service degradation

## Observability Requirements

Before running ANY production experiment:
- Distributed tracing active on affected services
- Real-time error rate dashboards accessible
- SLO burn-rate alerts configured and tested
- Customer-facing synthetic monitors running
- Experiment-specific metrics tagged and dashboarded

## Anti-Patterns

- Running experiments during incidents or deployments
- "Exploratory chaos" without hypothesis (random failure injection)
- Skipping staging validation for "simple" experiments
- No rollback plan or untested rollback mechanism
- Experimenting on services without observability coverage
- Team unaware an experiment is running
- Reusing old abort thresholds without recalibrating to current baseline

## Post-Experiment Process

1. Document: hypothesis, actual result, surprises
2. Action items: remediation tickets with priority
3. Share: team-wide findings (failures are learning, not blame)
4. Update runbooks: if experiment revealed response gaps
5. Schedule follow-up: re-test after remediation applied
