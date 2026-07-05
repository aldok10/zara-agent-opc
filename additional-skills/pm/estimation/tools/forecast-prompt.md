# Delivery Forecast Prompt

## Input Required

| Field | Value |
|-------|-------|
| Items remaining | ___ (count of backlog items) |
| Historical throughput | ___ items/week (last 8-12 weeks) |
| Throughput std dev | ___ (weekly variation) |
| Start date | ___ |

## Prompt Template

```
Given:
- Remaining items: {count}
- Weekly throughput: mean={mean}, SD={sd} (last {N} weeks)
- Throughput range: [{min}, {max}] items/week

Generate probabilistic forecast:
- 50% confidence (coin flip): ___
- 85% confidence (likely): ___
- 95% confidence (almost certain): ___

Method: Monte Carlo (10,000 simulations), sample with
replacement from historical weekly throughput.
```

## Quick Formula (no simulation)

```
weeks_50 = items / mean_throughput
weeks_85 = items / (mean_throughput - 1*SD)
weeks_95 = items / (mean_throughput - 1.65*SD)
```

## Output Format

> "We forecast delivery of {N} items:
> - 50%: by {date} ({X} weeks)
> - 85%: by {date} ({Y} weeks)
> - 95%: by {date} ({Z} weeks)
> Based on {W} weeks of throughput data."
