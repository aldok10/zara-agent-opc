---
type: fact
title: "SLO Burn Rate Alerting"
---

# SLO Burn Rate Alerting

Multi-window burn-rate alerting that replaces static threshold alerts with error-budget-aware signals.

## Core Concepts

**Error budget**: the allowed failure amount over a compliance period. 99.9% availability over 30 days = 43.2 minutes of allowed downtime.

**Burn rate**: how fast you're consuming error budget. Burn rate 1x = budget lasts exactly the compliance period. Burn rate 10x = budget exhausted in 3 days (30-day window).

**Multi-window**: combine a short window (detects fast) with a long window (prevents false positives).

## Standard Alert Windows

For a 30-day SLO compliance period:

| Severity | Short Window | Long Window | Burn Rate | Budget Consumed | Response |
|----------|-------------|-------------|-----------|-----------------|----------|
| PAGE | 1h | 5 min | 14.4x | 2% in 1h | Wake someone up |
| PAGE | 6h | 30 min | 6x | 5% in 6h | Interrupt current work |
| TICKET | 3d | 6h | 1x | 10% in 3d | Plan fix this sprint |

Two page-level alerts with different windows catch both spikes and slow burns.

## SLI Types

Common SLI specifications:

**Availability SLI**: proportion of successful requests
```
sum(rate(http_requests_total{code!~"5.."}[window]))
/
sum(rate(http_requests_total[window]))
```

**Latency SLI**: proportion of requests faster than threshold
```
sum(rate(http_request_duration_seconds_bucket{le="0.3"}[window]))
/
sum(rate(http_request_duration_seconds_count[window]))
```

**Freshness SLI** (for pipelines): proportion of time data is fresh
```
1 - (minutes_since_last_successful_run > threshold) / window_minutes
```

## Sloth: SLO-as-Code

Sloth generates Prometheus recording rules and alerts from YAML:

```yaml
version: "prometheus/v1"
service: "payment-api"
labels:
  team: "payments"
slos:
  - name: "requests-availability"
    objective: 99.9
    sli:
      events:
        error_query: sum(rate(http_requests_total{service="payment",code=~"5.."}[{{.window}}]))
        total_query: sum(rate(http_requests_total{service="payment"}[{{.window}}]))
    alerting:
      name: PaymentAvailabilityBudgetBurn
      labels:
        category: availability
      annotations:
        runbook: "https://runbooks.internal/payment-availability"
      page_alert:
        labels:
          severity: critical
      ticket_alert:
        labels:
          severity: warning
```

Sloth outputs: recording rules for burn rate at each window, multi-window alert rules, and Grafana dashboard JSON.

## Error Budget Policies

Define what happens at budget thresholds:

| Budget Remaining | Action |
|-----------------|--------|
| > 50% | Normal velocity, ship features |
| 25-50% | Increase review rigor, limit risky deploys |
| 10-25% | Freeze non-critical changes, focus on reliability |
| < 10% | All engineering effort on reliability until budget recovers |

Automated enforcement: CI/CD gates check remaining budget before allowing deployments.

## Pyrra and OpenSLO Alternatives

**Pyrra**: Kubernetes-native SLO controller, stores SLO definitions as CRDs, generates alerts and dashboards. Lighter than Sloth for K8s-native shops.

**OpenSLO**: vendor-neutral SLO spec (YAML). Supported by Nobl9, Dynatrace, and custom tooling. Good for multi-tool environments.

## Grafana SLO Plugin

Grafana Cloud and Grafana 11+ include native SLO tracking:

- Define SLO in UI or Terraform
- Auto-generates recording rules in Mimir
- Built-in burn rate dashboard and alerting
- Integrates with Grafana Alerting for routing

## Common Mistakes

- Setting objectives too tight (99.99% for internal tools -- creates toil with no user benefit)
- Using request-based SLI for user-journey SLOs (should be time-based or composite)
- Alerting on raw error rate instead of burn rate (ignores budget context)
- Not separating SLI by traffic type (batch vs interactive have different thresholds)
- Compliance window too short (7 days is too noisy; 30 days is standard)
- Missing the "ticket" alert tier (only paging means small leaks go unnoticed)

## Composite SLOs

For user journeys spanning multiple services:

```
journey_success = checkout_available AND payment_available AND inventory_fresh
```

Weight by traffic proportion or use worst-of semantics. Track as separate SLO with its own budget.

## Relationship to Incident Severity

SLO burn rate drives incident severity classification:

- SEV1: error budget exhausted (0% remaining)
- SEV2: burn rate > 50% budget consumed in 1 hour window
- SEV3: elevated burn rate detected in 6h window

This removes subjective severity assignment from incident triage.
