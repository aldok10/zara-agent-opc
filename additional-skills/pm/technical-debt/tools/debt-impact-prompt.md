# Debt Impact Analysis Prompt

## Template

```
Calculate business impact for tech debt item: [DEBT DESCRIPTION]

Input data needed:
- Cycle time impact: how much slower are PRs touching this area? [current vs healthy]
- Incident correlation: incidents in last 90 days traceable to this debt? [count, severity, MTTR]
- Developer friction: survey score or qualitative signal for this area [1-5 or quotes]
- Blast radius: how many teams/services depend on this code? [count]

Quantification framework:
1. TIME COST: (extra hours/PR) x (PRs/sprint touching area) x (eng hourly cost) = $/sprint
2. INCIDENT COST: (incidents/quarter) x (avg MTTR hours) x (engineers involved) x (hourly cost) = $/quarter
3. OPPORTUNITY COST: features delayed or descoped due to this debt = estimated revenue impact
4. FRICTION TAX: attrition risk premium for frustrated engineers = retention cost signal

ROI framing:
- Fix cost: [estimated sprints] x [team size] x [sprint cost]
- Payback period: fix cost / (quarterly savings from time + incident reduction)
- Break-even: number of sprints until fix pays for itself

Output: one-page business case with $ impact, payback period, priority recommendation.
```
