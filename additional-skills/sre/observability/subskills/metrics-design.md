---
type: subskill
title: "Metrics Design"
---

# Metrics Design

## Core Concepts
- Metrics are numeric measurements collected at regular intervals (counters, gauges, histograms)
- RED method for services: Rate, Errors, Duration
- USE method for resources: Utilization, Saturation, Errors
- Cardinality: number of unique label combinations; high cardinality = high storage/query cost
- SLI (Service Level Indicator): the specific metric measuring user-facing reliability

## Key Practices
- Instrument the four golden signals: latency, traffic, errors, saturation
- Use histograms over averages for latency - percentiles reveal tail behavior
- Keep label cardinality bounded: avoid user IDs, request IDs, or unbounded values as labels
- Name metrics consistently: `<namespace>_<subsystem>_<name>_<unit>` (e.g., `http_request_duration_seconds`)
- Define meaningful SLIs from user perspective, derive SLOs, then build error budgets

## Common Mistakes
- Using averages for latency SLIs (hides P99 problems affecting real users)
- Exploding cardinality with high-dimensional labels, causing performance degradation
- Collecting metrics without defining what action to take when they change

## When to Apply
- Instrumenting a new service for production observability
- Defining SLIs/SLOs as part of service level agreements
- Diagnosing performance issues by identifying which signals to measure
