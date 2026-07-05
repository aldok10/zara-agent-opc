---
type: fact
title: "Metrics Definition"
---

# Metrics Definition

## Types of Metrics

### Leading Indicators

Predict future outcomes. Act as early warning signals.

| Metric | What It Predicts |
|--------|-----------------|
| Sign-up conversion rate | Future revenue |
| Feature adoption rate | Retention |
| Support ticket volume | Churn |
| Build failure rate | Delivery slowdown |
| Code review turnaround | Developer productivity |

### Lagging Indicators

Confirm what already happened. Measure outcomes.

| Metric | What It Confirms |
|--------|-----------------|
| Monthly recurring revenue | Business health |
| Customer churn rate | Product-market fit |
| Net Promoter Score | Customer satisfaction |
| Deployment frequency | Engineering maturity |
| Mean time to recovery | Operational excellence |

## KPI Design Principles

### SMART Criteria for Metrics

- **Specific**: Exactly what is being measured? "User engagement" is vague. "Daily active users who complete at least one core action" is specific.
- **Measurable**: Can you capture this data reliably with current instrumentation?
- **Actionable**: If the metric moves, do you know what to investigate or change?
- **Relevant**: Does it connect to a business outcome the team can influence?
- **Time-bound**: Over what period? Daily, weekly, monthly rolling average?

### Counter vs. Gauge vs. Distribution

- **Counter**: Monotonically increasing (total orders placed)
- **Gauge**: Point-in-time value (active connections, queue depth)
- **Distribution**: Spread of values (response time P50/P95/P99)

## Measurement Framework

### HEART Framework (Google)

| Dimension | Signal | Metric |
|-----------|--------|--------|
| Happiness | Survey responses | NPS, CSAT score |
| Engagement | Core actions | DAU/MAU ratio |
| Adoption | New user behavior | % completing onboarding |
| Retention | Return behavior | D7, D30 retention |
| Task Success | Completion | Task success rate, time-on-task |

### AARRR (Pirate Metrics)

1. **Acquisition**: Where do users come from? (channel conversion rates)
2. **Activation**: Do they have a good first experience? (activation rate)
3. **Retention**: Do they come back? (cohort retention curves)
4. **Revenue**: Do they pay? (ARPU, LTV)
5. **Referral**: Do they tell others? (viral coefficient, referral rate)

## Defining a Metric Specification

For each metric, document:

```
Name: [Clear, unambiguous name]
Definition: [Exact calculation formula]
Data Source: [Where the data comes from]
Granularity: [Per-user, per-session, per-transaction]
Time Window: [Rolling 7-day, calendar month, etc.]
Segments: [Breakdown dimensions -- plan, region, device]
Target: [Goal value with timeframe]
Alert Threshold: [When to investigate]
Owner: [Who is responsible for this metric]
```

## Common Pitfalls

### Vanity Metrics

Total registered users, page views without context, total downloads. These go up and to the right regardless of product health.

### Metric Gaming

If you measure lines of code, people write verbose code. If you measure tickets closed, people split tickets. Design metrics that are hard to game by combining quantity with quality.

### Proxy Drift

You pick a proxy metric because the real thing is hard to measure. Over time, the proxy becomes the goal and the original intent is forgotten. Revisit whether proxies still correlate quarterly.

### Survivor Bias

Only measuring behavior of active users ignores the ones who left. Always pair usage metrics with churn/drop-off analysis.

## Metric Hygiene

- Define metrics BEFORE building features (prevents cherry-picking)
- Document the exact SQL/query that produces each metric
- Version metric definitions (changing calculation = new metric)
- Review metric relevance quarterly
- Sunset metrics nobody acts on
- Pair every efficiency metric with a quality metric
