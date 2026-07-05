# Prioritization Matrix

## Scoring Formula

```
Priority Score = (Impact on Velocity × Frequency of Pain) / Cost to Fix
```

Each factor scored 1-5:
- **Impact on Velocity**: How much this slows the team (1=minor, 5=blocking)
- **Frequency of Pain**: How often devs hit this (1=rarely, 5=daily)
- **Cost to Fix**: Effort to resolve (1=hours, 5=multi-sprint)

Score range: 0.2 to 25. Higher = more urgent.

## Decision Thresholds

| Score | Category | Action |
|-------|----------|--------|
| >8 | Immediate | Next sprint, non-negotiable |
| 4-8 | Planned | Schedule within current quarter |
| <4 | Accept | Monitor, fix opportunistically |

## Ranking Criteria (Beyond Score)

Apply tiebreakers in order:
1. Blast radius: how many teams/services affected
2. Compounding: is interest growing? (dependency rot, coupling spread)
3. Opportunity: overlaps with planned feature work
4. Risk: could this cause an incident?

## ROI Framing for Stakeholders

Never say "refactoring." Frame as:
- "Investing in delivery speed" - show cycle time data
- "Reducing incident risk" - show near-miss or incident correlation
- "Unblocking feature X" - tie to roadmap item
- "Protecting team retention" - cite friction survey data

Template: "This debt item costs us ~{X} hours/sprint in workarounds. Fixing it is {Y} days. ROI breakeven in {Z} sprints."

## Stakeholder Buy-in Technique

1. Show the interest payment (time spent on workarounds, per sprint)
2. Show the principal (cost to fix, one-time)
3. Calculate breakeven point
4. Tie to business outcome (throughput, reliability, hiring)

## Scoring Template

| Item | Impact (1-5) | Frequency (1-5) | Cost (1-5) | Score | Category |
|------|:---:|:---:|:---:|:---:|----------|
| [item] | | | | | |

## Verification

- [ ] All debt items scored with three factors
- [ ] Thresholds applied, categories assigned
- [ ] Top items have ROI framing ready for stakeholders
- [ ] Quarterly re-scoring scheduled
