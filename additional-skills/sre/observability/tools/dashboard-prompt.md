---
type: tool
title: "Observability Dashboard Design Prompt"
---

# Observability Dashboard Design Prompt

## Purpose
Design SLI-driven observability dashboards using RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors) methods.

## When to Use
- Creating dashboards for a new service
- Redesigning existing dashboards that aren't useful during incidents
- Implementing SLO-based monitoring
- Setting up team on-call dashboards

## Prompt Template

```
You are an observability engineer designing monitoring dashboards.

CONTEXT:
- Service: {service_name_and_purpose}
- Architecture: {monolith|microservices|serverless}
- Monitoring stack: {prometheus_grafana|datadog|cloudwatch|newrelic}
- Current dashboards: {none|basic|needs_redesign}
- On-call team size: {count}
- SLOs defined: {yes_list_them|no}

SERVICE DETAILS:
{describe_endpoints_dependencies_and_traffic_patterns}

DESIGN DASHBOARDS:

1. SERVICE OVERVIEW (first thing you look at)
   - SLO status: error budget remaining, burn rate
   - Traffic: requests/sec by endpoint (what's normal vs current)
   - Errors: error rate by type (4xx, 5xx, timeouts)
   - Latency: p50, p95, p99 by endpoint
   - Saturation: queue depth, thread pool usage, connection pool

2. RED METHOD (per endpoint)
   - Rate: requests/second, broken down by status code
   - Errors: error ratio, error types, correlation with deployments
   - Duration: latency histogram, percentile trends over time
   - Comparison: current vs same time last week

3. USE METHOD (per resource)
   - CPU: utilization %, request vs limit (containers)
   - Memory: utilization, OOM events, GC pressure
   - Disk: IOPS, throughput, queue depth, latency
   - Network: bandwidth, packet drops, connection count
   - Application resources: thread pool, connection pool, goroutine count

4. DEPENDENCY DASHBOARD
   - Upstream (what calls us): traffic by caller, error injection point
   - Downstream (what we call): latency by dependency, circuit breaker state
   - Database: query latency, connection pool, slow queries
   - Cache: hit rate, eviction rate, latency
   - Message queue: publish rate, consume rate, lag

5. ALERT DASHBOARD
   - Active alerts and their current severity
   - Recent alert history (firing, resolved, acknowledged)
   - Alert noise metrics (are alerts actionable?)
   - Runbook links for each alert

DASHBOARD PRINCIPLES:
- Top-to-bottom: SLO → symptoms → causes
- Time range: default to last 1h, allow 24h/7d/30d
- Annotations: deployments, incidents, config changes
- Thresholds: visual indicators for normal/warning/critical zones

RULES:
- Every panel must answer a question (not just "show CPU")
- Group by user impact, not by infrastructure component
- Default view should be useful during an incident at 3am
- Include "what's normal" baselines for comparison
- Link dashboards: overview → drill-down → specific resource
- No dashboard with >20 panels (cognitive overload)
```

## Output Format

```markdown
## Dashboard Design: {Service}

### Dashboard Hierarchy
1. Service Overview (incident first-look)
2. Endpoint Detail (per-endpoint deep dive)
3. Infrastructure (resource health)
4. Dependencies (external services)

### Panel Specifications
| Dashboard | Panel | Metric | Query | Threshold |
|-----------|-------|--------|-------|-----------|

### SLO Panels
| SLO | SLI Metric | Target | Window | Budget Burn |

### Alert Rules (tied to dashboards)
| Alert | Condition | Severity | Runbook |

### Grafana/Datadog JSON
[Tool-specific dashboard-as-code if requested]
```
