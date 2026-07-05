---
name: estimation
description: "Estimation: probabilistic forecasting, Monte Carlo, cycle time, sizing"
---

# Estimation Skill

## Scope

Probabilistic delivery forecasting, item-level prediction, relative sizing, team calibration. Produces ranges with confidence levels, not point estimates.

## Core Principles

1. Monte Carlo simulation > story points for delivery date forecasting
2. Cycle time percentiles (50th/70th/85th/95th) for item-level prediction
3. T-shirt sizing for relative comparison, never commitment
4. Estimate ranges, not single numbers  -  always state confidence
5. Historical data > expert opinion  -  measure, don't guess
6. 3-point estimates (PERT): best/likely/worst when no historical data
7. Reserve 20% buffer for unknowns (industry consensus, no single authoritative source)
8. Re-estimate when scope changes >15% or new risk surfaces
9. Track estimate accuracy to calibrate over time
10. Smaller items = more predictable; split before estimating

## DO NOT

1. Treat estimates as commitments or promises
2. Use single-point estimates for delivery dates
3. Estimate without historical data AND without stating uncertainty
4. Apply precision theater (false exactness on uncertain work)
5. Skip re-estimation when scope materially changes

## Route to Subskill

| Need | Subskill | When |
|------|----------|------|
| Delivery date forecast | `monte-carlo` | >5 items, have throughput history |
| Single item prediction | `cycle-time-forecasting` | "When will this be done?" |
| Relative comparison | `relative-sizing` | Backlog grooming, shared understanding |
| Team session facilitation | `estimation-games` | Planning poker, magic estimation |

## Decision Matrix

```
Have 8+ sprints throughput data?
  YES → Monte Carlo (monte-carlo.md)
  NO → Have cycle time data for similar items?
    YES → Cycle Time Forecasting (cycle-time-forecasting.md)
    NO → Need team alignment on size?
      YES → Relative Sizing session (relative-sizing.md)
      NO → PERT 3-point estimate (estimation-games.md)
```

## Verification Criteria

- Forecast includes confidence interval (50/70/85/95 percentile)
- Historical data source cited or absence acknowledged
- Range width proportional to uncertainty
- Buffer explicitly stated and justified
- No single-point date without confidence qualifier

## AI-Era Context (2026)

Monte Carlo simulations are trivial with AI -- any team can generate probabilistic forecasts from cycle time data in seconds. Historical cycle time analysis replaces story point debates as the default estimation approach. AI forecasts complement human judgment but do not replace it: they miss context like team changes, holiday periods, or architecture shifts that invalidate historical patterns. The risk is false precision -- AI-generated forecasts look authoritative but garbage-in remains garbage-out.

## Terminal State

This skill's job is done when:
- Forecast delivered with confidence intervals (50/70/85/95 percentiles)
- Stakeholder understands it's a RANGE not a date
- Calibration plan established (compare predicted vs actual quarterly)
- No single-point estimates presented as commitments

## Knowledge

- `knowledge/calibration.md` -- calibration techniques and review cadence
- `knowledge/formulas.md` -- estimation formulas and statistical methods
