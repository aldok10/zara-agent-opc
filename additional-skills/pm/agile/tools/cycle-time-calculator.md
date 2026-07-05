---
type: tool
title: "Cycle Time Calculator"
---

# Cycle Time Calculator

## Formula

```
Cycle Time = Completion Date - Start Date (in calendar/business days)
```

## Percentile Calculation

Given N items sorted by cycle time ascending:
- P50 index: ceil(N × 0.50)
- P85 index: ceil(N × 0.85)
- P95 index: ceil(N × 0.95)

## Example (12 items, sorted)

```
Items: [1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 9, 14]
P50: index ceil(12×0.50) = 6 → value: 4 days
P85: index ceil(12×0.85) = 11 → value: 9 days
P95: index ceil(12×0.95) = 12 → value: 14 days
SLE: "85% of items completed within 9 days"
```

## Interpretation Guide

| Pattern | Meaning | Action |
|---------|---------|--------|
| P85 decreasing | Flow improving | Continue current practices |
| P85 increasing | Flow degrading | Check WIP, blockers, dependencies |
| Wide P50-P95 gap | High variability | Decompose large items, add WIP limits |
| Narrow gap | Predictable | Tighten SLE, communicate confidence |

## Data Source

Extract from issue tracker: `start_date` (moved to In Progress) and `end_date` (moved to Done). Exclude expedite items from baseline calculation.
