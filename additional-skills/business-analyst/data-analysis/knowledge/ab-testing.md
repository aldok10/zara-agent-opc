# A/B Testing

## Experiment Design

### Hypothesis Format

Every experiment starts with a clear hypothesis:

"If we [change], then [metric] will [direction] by [magnitude] because [reasoning]."

Example: "If we simplify the checkout form from 5 fields to 3, then checkout completion rate will increase by 10% because reduced friction lowers abandonment."

### Key Components

1. **Control**: Current experience (unchanged)
2. **Treatment**: Modified experience (one change)
3. **Primary metric**: The single metric that determines success
4. **Guardrail metrics**: Metrics that must NOT degrade (revenue, error rate)
5. **Duration**: How long to run the experiment
6. **Allocation**: What % of traffic goes to each variant

### Single Variable Principle

Change one thing per experiment. If you change the button color AND the copy AND the layout, you cannot attribute results to any single change.

Exception: Multivariate testing (MVT) designs that explicitly test combinations, but these require much larger sample sizes.

## Sample Size

### Minimum Sample Size Formula

To detect a given effect with statistical power:

- **Baseline rate**: Current conversion rate (e.g., 5%)
- **Minimum detectable effect (MDE)**: Smallest change worth detecting (e.g., 10% relative = 0.5% absolute)
- **Significance level (alpha)**: Usually 0.05 (5% false positive rate)
- **Power (1-beta)**: Usually 0.80 (80% chance of detecting real effect)

### Rules of Thumb

| Baseline Rate | MDE (relative) | Approx. Sample Per Variant |
|---------------|----------------|---------------------------|
| 1% | 20% | ~80,000 |
| 5% | 10% | ~30,000 |
| 10% | 5% | ~60,000 |
| 20% | 5% | ~25,000 |
| 50% | 2% | ~40,000 |

Lower baseline rates and smaller effects need larger samples.

### Duration Considerations

- Run for at least 1 full business cycle (typically 1-2 weeks)
- Account for day-of-week effects
- Never stop early because results "look good" -- this inflates false positives
- Pre-commit to a runtime before launching

## Statistical Significance

### Frequentist Approach

- P-value < 0.05: result is statistically significant
- P-value is NOT the probability the treatment is better
- P-value IS the probability of seeing this result if there were no real difference
- Confidence interval: if it excludes zero, the effect is significant

### Bayesian Approach

- Reports probability that treatment beats control (e.g., "94% chance variant B is better")
- More intuitive for stakeholders
- Allows continuous monitoring without peeking penalties
- Requires prior assumptions

### Common Mistakes

**Peeking**: Checking results daily and stopping when significant. This inflates false positive rate from 5% to 20-30%. Use sequential testing methods if you must monitor continuously.

**Multiple comparisons**: Testing 5 metrics inflates false positive risk. Apply Bonferroni correction or designate one primary metric.

**Underpowered tests**: Running experiments too short to detect real effects. "No significant result" is not the same as "no effect."

**Selection bias**: Non-random assignment (e.g., new users vs. existing users in different groups).

## Experiment Lifecycle

1. **Hypothesis**: Write a specific, falsifiable prediction
2. **Design**: Choose metrics, calculate sample size, set duration
3. **Instrument**: Ensure data collection is working before launch
4. **Launch**: Random assignment, monitor for errors (not results)
5. **Wait**: Let it run for the pre-committed duration
6. **Analyze**: Check primary metric, guardrails, segments
7. **Decide**: Ship, iterate, or abandon
8. **Document**: Record learnings regardless of outcome

## Segmentation Analysis

After overall results, check for heterogeneous effects:
- New vs. returning users
- Mobile vs. desktop
- Geographic regions
- Plan tier / customer segment

A treatment might help one segment while hurting another -- overall result masks this.
