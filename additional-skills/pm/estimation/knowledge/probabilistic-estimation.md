---
type: fact
title: "Probabilistic Estimation"
---

# Probabilistic Estimation

## Why Probabilistic Over Point Estimates

Point estimates ("this will take 3 weeks") are almost always wrong. Probabilistic estimation provides:
- Range of likely outcomes (not false precision)
- Confidence levels stakeholders can plan around
- Historical calibration over time
- Honest communication about uncertainty

## Monte Carlo Simulation

### How It Works
1. Break work into tasks
2. Assign probability distributions to each task (not single numbers)
3. Run thousands of random simulations sampling from those distributions
4. Aggregate results into a probability distribution for total delivery time

### Practical Example
```
Task A: 2-5 days (most likely 3)
Task B: 1-8 days (most likely 3, high uncertainty)
Task C: 3-4 days (most likely 3, low uncertainty)

Run 10,000 simulations:
- 50% chance done by day 11
- 85% chance done by day 14
- 95% chance done by day 17
```

### Distribution Types for Tasks
- **Triangular**: min, most likely, max (simple, good for most tasks)
- **PERT (Beta)**: like triangular but weighted toward most likely
- **Log-normal**: skewed right (delays common, early finish rare)
- **Uniform**: equal probability across range (maximum uncertainty)

### Tools
- Excel/Sheets with RAND() and percentile functions
- Focused Objective (Actionable Agile)
- Custom scripts (Python with numpy/scipy)
- Troy Magennis spreadsheets (free)

### Implementation
```python
import numpy as np

def simulate_project(tasks, iterations=10000):
    """
    tasks: list of (min, mode, max) tuples
    Returns: array of total durations
    """
    results = []
    for _ in range(iterations):
        total = sum(
            np.random.triangular(t[0], t[1], t[2])
            for t in tasks
        )
        results.append(total)
    return np.array(results)

tasks = [(2, 3, 5), (1, 3, 8), (3, 3, 4)]
results = simulate_project(tasks)

print(f"50th percentile: {np.percentile(results, 50):.1f} days")
print(f"85th percentile: {np.percentile(results, 85):.1f} days")
print(f"95th percentile: {np.percentile(results, 95):.1f} days")
```

## Reference Class Forecasting

### Principle
Instead of estimating from first principles ("how long should this take?"), use historical data from similar completed work ("how long did similar things actually take?").

### Process
1. Identify the reference class (similar past projects/features)
2. Collect actual duration data from that class
3. Use the distribution of actuals as your forecast
4. Adjust only for specific, documented differences

### Example
```
Past 20 "medium" features delivered:
- Minimum: 8 days
- 25th percentile: 12 days
- Median: 16 days
- 75th percentile: 22 days
- Maximum: 45 days

New "medium" feature estimate:
- Likely range: 12-22 days (50% confidence)
- Safe commitment: 22 days (75% confidence)
- High confidence: 30 days (90% confidence)
```

### Building Reference Classes
- Size categories: S/M/L based on historical actual effort
- Type categories: new feature, bug fix, integration, migration
- Track: estimated vs actual for every item (calibration data)
- Minimum 10 data points per class for meaningful statistics

### Bias Correction
Reference class forecasting counteracts:
- **Planning fallacy**: tendency to underestimate
- **Optimism bias**: "this time will be different"
- **Anchoring**: fixating on initial estimate regardless of evidence

## Confidence Intervals

### Communicating Estimates

| Confidence | Meaning | Use For |
|---|---|---|
| 50% | Coin flip — equally likely above or below | Internal planning |
| 75% | Likely, but 1-in-4 chance of exceeding | Team commitments |
| 85% | High confidence, small miss risk | Stakeholder commitments |
| 95% | Near-certain (includes padding) | External deadlines, contracts |

### How to Present
```
"We'll deliver the search feature in 3-5 weeks.
 - 50% chance by end of week 3
 - 85% chance by end of week 4
 - 95% chance by end of week 5

 I recommend committing to week 4 externally."
```

### Widening Factors
Add uncertainty for:
- New technology (team hasn't used before): +30-50%
- Unclear requirements (discovery needed): +50-100%
- External dependencies (third-party API, other team): +20-40%
- Key person risk (only one person knows the system): +20-30%

## Calibration

### The Goal
A well-calibrated estimator's 80% confidence intervals contain the actual result 80% of the time. Not 60%. Not 95%.

### Tracking Calibration
```
Quarter results:
- 80% CIs that contained actual: 12/15 = 80% ← well calibrated
- 80% CIs that contained actual: 8/15 = 53% ← overconfident (intervals too narrow)
- 80% CIs that contained actual: 14/15 = 93% ← underconfident (intervals too wide)
```

### Improving Calibration
- Track every estimate vs actual (no exceptions)
- Review misses: was new info available, or was estimate wrong?
- Widen intervals if consistently overconfident
- Narrow intervals if consistently underconfident
- Practice with trivia questions (calibration training)

## Anti-Patterns

- Converting ranges to single numbers for executives ("just give me a date")
- Using best-case as the commitment (guaranteed disappointment)
- Not updating estimates as work progresses (estimate at start ≠ estimate mid-project)
- Ignoring historical data in favor of "this project is different"
- Padding estimates secretly instead of communicating uncertainty openly
- Estimating effort without considering calendar time (interrupts, meetings, context-switching)
- Treating 50% confidence as a commitment (it will miss half the time by definition)
