---
type: fact
title: "Estimation Formulas Reference"
---

# Estimation Formulas Reference

## Monte Carlo Setup

| Parameter | Value |
|-----------|-------|
| Simulations | N = 10,000 |
| Sampling | With replacement from historical throughput |
| Input | Items remaining + throughput per period (8+ periods) |
| Output | Percentile dates (50th, 70th, 85th, 95th) |

## PERT

| Formula | (O + 4M + P) / 6 |
|---------|-------------------|
| Standard Deviation | (P - O) / 6 |
| Variance | ((P - O) / 6)^2 |
| 95% confidence | PERT +/- 2*SD |

## Little's Law

| Formula | WIP = Throughput x Cycle Time |
|---------|-------------------------------|
| Cycle Time | WIP / Throughput |
| Throughput | WIP / Cycle Time |

Assumptions: steady-state system, items that enter must eventually leave, stable WIP.

**Critical distinction (Vacanti)**: Little's Law specifies a deterministic relationship between averages when looking BACK over historical data. It is NOT designed for making deterministic forecasts about the future. Use Monte Carlo for forecasting.

## Confidence Intervals

| Percentile | Z-score | Meaning |
|-----------|---------|---------|
| 50th | 0.00 | Coin flip |
| 85th | 1.04 | High confidence |
| 95th | 1.65 | Near certain |
| 99th | 2.33 | Almost guaranteed |

## Throughput Calculation

```
Throughput = items_completed / time_period
Rolling average = sum(last_N_periods) / N
Recommended N: 8-12 periods
```

## Velocity Calculation

```
Velocity = story_points_completed / sprint
Use: last 3-6 sprints average
Caution: velocity ≠ throughput, not comparable across teams
```

## Forecast Date Formula

```
periods_needed = items_remaining / avg_throughput
forecast_date = today + (periods_needed * period_length)
Add buffer: forecast_date + (periods_needed * 0.2 * period_length)
```

## Reference Class Forecasting

| Step | Action |
|------|--------|
| 1 | Identify reference class (similar past projects) |
| 2 | Get distribution of outcomes from that class |
| 3 | Position current project within distribution |
| 4 | Adjust for specific known differences |

Key insight: outside view (base rates) > inside view (project specifics). Humans systematically underweight base rates.

## Pi Rule of Thumb

> Multiply initial estimate by π (≈3.14) for realistic delivery date.

Why it works: accounts for unknowns, integration, testing, deployment, rework. Empirically validated across software projects. Use as sanity check, not primary method.

## #NoEstimates Forecasting

| Input | Method |
|-------|--------|
| Items remaining | Count backlog items (similar size) |
| Historical throughput | Items/week over last 8-12 weeks |
| Forecast | Monte Carlo on throughput → percentile dates |

Skip: story points, t-shirt sizes, planning poker. Prerequisite: items roughly similar size (split if not). Works when you have 8+ weeks of throughput data.

## PERT Weighted Example

```
Task: "Build auth integration"
Optimistic (O):  3 days
Most Likely (M): 7 days
Pessimistic (P): 15 days

PERT estimate = (3 + 4×7 + 15) / 6 = 7.67 days
SD = (15 - 3) / 6 = 2.0 days
95% range = 7.67 ± 4.0 = [3.67, 11.67] days
```
