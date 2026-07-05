---
type: fact
title: "Metrics Design for Products"
---

# Metrics Design for Products

## HEART Framework (Google)

| Dimension | Definition | Example Metrics |
|-----------|-----------|-----------------|
| **Happiness** | Satisfaction, ease | NPS, CSAT, SUS |
| **Engagement** | Frequency/depth | DAU/MAU, session length |
| **Adoption** | New users of feature | Sign-ups, activation % |
| **Retention** | Coming back | D1/D7/D30 retention, churn |
| **Task Success** | Efficiency | Completion rate, time-to-task |

Apply: choose 1-3 dimensions → define signals (user actions) → choose metrics (quantifiable).

## North Star Metric

Single metric capturing core value delivered to users.

Properties: reflects user value, leading indicator of business success, actionable by team, measurable weekly.

| Business Type | North Star | Why |
|--------------|-----------|-----|
| Marketplace | Weekly transactions | Both-sides engaged |
| SaaS (collab) | Weekly active teams | Team adoption = stickiness |
| E-commerce | Weekly purchases/buyer | Repeat = retention |
| Dev tool | Weekly builds triggered | Integrated into workflow |

Break into input metrics:
```
North Star: Weekly active teams
├── New sign-ups (acquisition)
├── Teams completing onboarding (activation)
├── Teams returning week 2+ (retention)
└── Members invited per team (expansion)
```

## Pirate Metrics (AARRR)

1. **Acquisition**: how users find you (traffic, channel conversion)
2. **Activation**: first "aha" moment (onboarding complete, first action)
3. **Retention**: users return (DAU/WAU/MAU, cohort curves)
4. **Revenue**: monetization (MRR, ARPU, LTV:CAC)
5. **Referral**: users bring others (K-factor, invites sent/accepted)

Find the weakest stage: map conversion between stages, biggest drop-off = highest impact.

## Leading vs Lagging Indicators

| Lagging (Outcome) | Leading (Predictor) |
|-------------------|---------------------|
| Monthly revenue | Trial-to-paid conversion this week |
| Churn rate | Support tickets, login frequency drop |
| NPS | Feature adoption of new release |
| LTV | Engagement depth in first 7 days |

Product teams should own ~70% leading, 30% lagging. Leading = time to intervene; lagging = confirms too late.

## Anti-Patterns

1. **Vanity metrics**: total sign-ups (always goes up, says nothing)
2. **Too many**: tracking 50+ → no focus
3. **Gaming-prone**: lines of code, ticket count
4. **Missing denominator**: "500 errors"  -  out of how many requests?

## Design Process

1. State the goal
2. Identify signals (user behaviors indicating progress)
3. Choose metric (quantifiable, comparable over time)
4. Set baseline (measure before changes)
5. Define target (specific + time-bound: "D7 retention 20%→30% by Q3")
6. Instrument (ensure tracking exists before building features)

## Segmentation Rules

Always break by: cohort (sign-up week), user type (free/paid), platform, acquisition channel. Aggregates hide problems  -  a "steady" average can mask one cohort thriving and another churning.
