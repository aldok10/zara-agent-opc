# Estimation Calibration

## Tracking Accuracy

For each completed item, record:

| Field | Value |
|-------|-------|
| Estimated | Original estimate (days/size/points) |
| Actual | Actual cycle time or effort |
| Ratio | Actual / Estimated |
| Category | Over (>1.2) / Accurate (0.8-1.2) / Under (<0.8) |

## Calibration Chart

Plot monthly:
- X-axis: month
- Y-axis: average ratio (actual/estimated)
- Target band: 0.8 - 1.2
- Trend line shows systematic bias direction

## When to Adjust

| Signal | Action |
|--------|--------|
| Ratio consistently >1.3 | Team under-estimates  -  inflate by ratio |
| Ratio consistently <0.7 | Team over-estimates  -  reduce buffer |
| High variance (SD >0.5) | Splitting problem  -  items too large |
| Ratio drifting over time | Context shift  -  re-anchor |

## Team Maturity Indicators

| Level | Accuracy rate (within 20%) | Typical cycle time SD |
|-------|---------------------------|----------------------|
| Forming | <40% | High |
| Norming | 40-60% | Moderate |
| Calibrated | 60-80% | Low |
| Predictable | >80% | Very low |

## Calibration Cadence

- Weekly: flag items exceeding 85th percentile cycle time
- Monthly: compute accuracy ratio, update calibration chart
- Quarterly: re-anchor reference stories, review systematic bias
- After team change: reset baseline, need 4+ sprints for new calibration

## Improving Calibration

1. Split large items (biggest source of variance)
2. Use historical data over gut feel
3. Track by category (bugs vs features estimate differently)
4. Discuss misses in retro (learn, don't blame)
5. Narrow confidence intervals as data grows

## AI Impact on Estimation (2024-2025)

| Factor | Adjustment |
|--------|-----------|
| AI-generated code | 1.7x more issues found in review (Google/MS data) |
| AI-assisted implementation | Faster coding, longer review/testing cycle |
| Net effect | Coding phase -40%, verification phase +60% |
| Estimate adjustment | Reduce build estimate, increase QA/review buffer |

Rule: when AI writes code, shift estimate weight from implementation → verification. Total timeline may not shrink as much as expected.

## Calibration Sprint Concept

For new teams or major composition changes:

| Sprint | Purpose |
|--------|---------|
| 1 | Baseline  -  no commitments, measure actuals only |
| 2 | First estimates  -  compare to sprint 1 actuals |
| 3 | Adjust  -  apply ratio from sprint 2 misses |
| 4 | Validate  -  accuracy should be >50% within 20% |

After 3-4 sprints: team has reliable throughput baseline. Before that: all forecasts carry high uncertainty disclaimer.

## Estimate Accuracy Tracking

Plot scatter: X = estimated size, Y = actual cycle time.
- Perfect calibration: points cluster on 45° line
- Systematic bias: cluster above (under-estimate) or below (over-estimate)
- Trend line slope >1.3: team consistently under-estimates
- Trend line slope <0.7: team consistently over-estimates
- High scatter (R² < 0.3): estimates have low signal, consider #NoEstimates approach
