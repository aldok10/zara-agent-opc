---
type: tool
title: "Monte Carlo Simulation Prompt Template"
---

# Monte Carlo Simulation Prompt Template

## Input Format

```
Throughput data (items/period): [n1, n2, n3, ...]
Period length: [1 week | 2 weeks]
Items remaining: N
Buffer: [0% | 20%]
```

## Prompt

Run Monte Carlo simulation with these parameters:
1. Sample with replacement from throughput data
2. Accumulate until items_remaining (+ buffer%) reached
3. Repeat 10,000 times
4. Report 50th, 70th, 85th, 95th percentile in periods and calendar dates

## Output Format

```
| Percentile | Periods | Calendar time | Target date |
|-----------|---------|---------------|-------------|
| 50% | X | Y weeks | YYYY-MM-DD |
| 85% | X | Y weeks | YYYY-MM-DD |
| 95% | X | Y weeks | YYYY-MM-DD |
```

## Interpretation Guide

- 50th: internal stretch target (coin flip odds)
- 85th: recommended external commitment
- 95th: hard deadline / contractual use
- If 95th-50th spread > 3 periods: high uncertainty, consider splitting scope
