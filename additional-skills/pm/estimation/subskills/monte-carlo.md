# Monte Carlo Simulation

## Purpose

Forecast delivery dates using throughput-based probabilistic simulation. Answers: "When will N items be done?" and "How many items can we deliver by date X?"

## Input Requirements

- Minimum ~10 throughput data points (e.g., 10 weeks/sprints). Quality depends on flow stability more than raw sample count.
- Throughput = items completed per time period (not points)
- Consistent time period (all weekly OR all bi-weekly)
- Scope: total items remaining (include discovery buffer)

## Simulation Steps

1. Collect historical throughput: items completed per period for 8+ periods
2. Set scope: number of remaining items (add 20% for unknowns)
3. Run N=10,000 simulations:
   - Each simulation: randomly sample (with replacement) from historical throughput
   - Accumulate sampled throughput until >= scope items completed
   - Record number of periods needed
4. Sort all 10,000 results ascending
5. Extract percentiles: 50th, 70th, 85th, 95th

## Interpreting Results

| Percentile | Meaning | Use for |
|-----------|---------|---------|
| 50th | Coin flip  -  50% chance of hitting | Internal planning |
| 85th | High confidence | External commitments |
| 95th | Near-certain | Contractual deadlines |

## Key Assumption (Vacanti)

The conditions present when you generated past data must be roughly similar to conditions during the forecast period (team capacity, mix of work, WIP level). If conditions have materially changed, the simulation is unreliable.

## When Monte Carlo is Unreliable

- <8 data points (insufficient sample)
- Team composition changed significantly
- Work type fundamentally different from historical
- External dependencies dominate timeline
- Throughput trend clearly non-stationary (improving/degrading)

## "How Many by Date" Variant

1. Calculate periods remaining until target date
2. Run 10,000 simulations of that many periods
3. Sum throughput per simulation
4. Percentiles now = item count (inverted confidence: 95th = conservative count)

## Tips

- Trim outliers only if explainable (holiday sprint, incident)
- Separate throughput by work type if mix changes
- Update monthly with fresh data
- Present as date range, not single date
