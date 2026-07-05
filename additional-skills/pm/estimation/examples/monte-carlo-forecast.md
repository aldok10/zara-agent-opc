# Example: Monte Carlo Forecast

## Input

Throughput (items/sprint, last 10 sprints): [8, 7, 10, 6, 9, 8, 11, 7, 9, 8]
Remaining items: 45
Sprint length: 2 weeks

## Simulation Logic

```
For each of 10,000 simulations:
  remaining = 45
  sprints = 0
  while remaining > 0:
    pick random value from [8,7,10,6,9,8,11,7,9,8]
    remaining -= picked_value
    sprints += 1
  record sprints
Sort all 10,000 results
```

## Results (representative)

| Percentile | Sprints needed | Calendar weeks | Date (from today) |
|-----------|---------------|----------------|-------------------|
| 50th | 5 | 10 weeks | ~2.5 months |
| 85th | 6 | 12 weeks | ~3 months |
| 95th | 7 | 14 weeks | ~3.5 months |

## Interpretation

"We have 85% confidence the 45 items will be complete within 6 sprints (12 weeks). Recommend committing to the 85th percentile date externally, use 50th for internal planning."

## With 20% Buffer

Items with buffer: 45 * 1.2 = 54 items
85th percentile shifts to ~7 sprints (14 weeks).

## Communication Template

> Based on our last 10 sprints of throughput data, we forecast completing the 45 remaining items between 10-14 weeks from now, with 85% confidence at 12 weeks.
