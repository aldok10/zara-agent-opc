---
type: subskill
title: "Dashboard Design & Visualization"
---

# Dashboard Design & Visualization

## Philosophy
Every dashboard answers a specific question. No question → delete the dashboard.

## Hierarchy
- **Executive**: system health at a glance (SLO status, error budget remaining). 5-second comprehension.
- **Service**: RED metrics per service (rate, errors, duration). Primary troubleshooting entry point.
- **Investigation**: detailed debugging view (trace samples, slow query breakdown, resource usage).

## Layout principles
- **Top to bottom** = general to specific (summary → details → raw data).
- **Left to right** = most important first (SLO → error rate → latency → throughput).
- **Consistent time range** across all panels (linked time picker).
- **Color coding**: green = healthy, yellow = degraded, red = broken. Use colorblind-friendly alternatives.

## Standard dashboards every service needs
1. **RED dashboard**: request rate, error rate, latency p50/p95/p99.
2. **Resource dashboard**: CPU, memory, disk, network (USE method).
3. **SLO dashboard**: error budget burn, compliance status, trend.
4. **Dependency dashboard**: upstream/downstream health, latency per dependency.

## Grafana best practices
- **Template variables**: select service, environment.
- **Annotations**: mark deploys and incidents on time series.
- **Alert integration**: show alert state directly on panels.

## Query optimization
- Avoid expensive regex.
- Use recording rules for complex Prometheus queries.
- Set reasonable default time ranges  --  don't query 90 days by default.

## Anti-patterns
- 50+ panels on one dashboard → cognitive overload.
- No template variables (one dashboard per service) → unmaintainable.
- Pretty but uninformative (pie charts for time-series data).
- No links between dashboards → can't drill down from summary to detail.
