# Cycle Time Forecasting

## Purpose

Predict single-item completion time using historical cycle time data. Pattern: "Stories like this take X-Y days."

## Core Concept

Cycle time = time from work started to work done. Use percentiles of similar past items to forecast future items.

## Percentile Selection

| Percentile | Risk tolerance | Use case |
|-----------|---------------|----------|
| 50th | Moderate risk | Internal targets |
| 70th | Moderate-low risk | Planning, moderate commitments |
| 85th | Low risk | Team commitments, SLEs |
| 95th | Minimal risk | External promises, SLAs |

## How to Filter

Filter historical data by attributes matching the item being estimated:

- **Story type**: bug vs feature vs tech debt
- **Size**: small/medium/large (if pre-categorized)
- **Team**: different teams have different cycle times
- **Component**: backend vs frontend vs full-stack
- **Priority**: expedited items often have shorter cycle time

More filters = smaller sample. Need 15+ data points minimum per category.

## Scatterplot Reading

- X-axis: completion date. Y-axis: cycle time in days
- Draw horizontal lines at 50th, 70th, 85th, 95th percentile (per Vacanti/ActionableAgile)
- Items above 95th line = outliers worth investigating
- Trend direction shows team improving or degrading

## Aging Analysis

For in-progress items:
1. Note current age (days since started)
2. Compare to percentile lines
3. If age > 85th percentile → item is aging, investigate blockers
4. Flag items exceeding 95th percentile as stalled

## Service Level Expectation (SLE)

Define: "X% of items complete within Y days"
Example: "85% of features complete within 12 days"

Use SLE to:
- Set team expectations
- Identify process problems (SLE miss rate increasing)
- Communicate predictability to stakeholders

## When to Use 85th vs 95th

- 85th: default for most commitments, balances confidence and padding
- 95th: contractual obligations, cross-team dependencies, hard deadlines
- 50th: stretch goals, internal sprint planning
