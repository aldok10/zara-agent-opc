# Check-In Cadence

## Why Weekly

Significantly higher completion rates with weekly check-ins (vendor studies suggest 40%+, exact figure varies by context).
Weekly = early signal on drift. Quarterly-only = post-mortem, not management.

## Check-In Template

```
KR: [key result text]
Confidence: [on-track / off-track / at-risk]
Progress: [X%] (current value: __ / target: __)
Changed since last week: [what moved, what didn't]
Blocker: [none / description + owner + action]
Next action: [one concrete step for this week]
```

## Confidence Scoring

| Level | Meaning | Action |
|-------|---------|--------|
| On-track | 70%+ confident we'll hit target | Continue execution |
| At-risk | 40-70% confident | Identify specific blocker, escalate if cross-team |
| Off-track | <40% confident | Replan: change approach, adjust target, or kill KR |

## Async Update Format (for Slack/docs)

```
[Team Name] Week X/13
O1: [Objective title]
  KR1: 45% | on-track | shipped auth flow, activation up 12%
  KR2: 20% | at-risk | blocked on data team, meeting Thu
  KR3: 60% | on-track | ahead of plan
```

## Cadence Structure

| Timing | Activity |
|--------|----------|
| Weekly (15min) | KR owner updates confidence + progress |
| Bi-weekly (30min) | Team sync: cross-KR dependencies, blockers |
| Mid-quarter (60min) | Full review: adjust targets if needed, document rationale |
| End-quarter (90min) | Score, retro, draft next quarter |

## When to Escalate

- Confidence drops to off-track for 2+ consecutive weeks
- Blocker requires decision from outside your team
- External dependency missed committed date
- KR becomes irrelevant due to strategy shift

## Adjustment Rules

- Adjusting a KR target mid-quarter: allowed with written rationale
- Dropping a KR entirely: requires leadership sign-off
- Adding a new KR mid-quarter: strongly discouraged (scope creep)
- Changing measurement method: document before/after, don't retroactively regrade

## Anti-Patterns

- Updating only at end of quarter (defeats purpose)
- Confidence always "on-track" with no data (false green)
- Check-ins become status meetings (keep to 15min, async-first)
- No action items from at-risk status (acknowledge without acting)
