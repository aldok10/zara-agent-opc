---
type: fact
title: "Evidence Levels"
---

# Evidence Levels

## Hierarchy (weakest to strongest)

| Level | Type | Example | Decision Weight |
|-------|------|---------|-----------------|
| 1 | Team opinion | "I think users want X" | Generates hypotheses only |
| 1.5 | AI-conversation insight | "AI-coded 200 support chats → pattern X" | Volume signal, needs human validation |
| 2 | Stakeholder input | "Sales says customers ask for X" | Directional, needs validation |
| 3 | Survey / stated preference | "60% said they'd use X" | Weak signal (stated != behavior) |
| 4 | Behavioral proxy | "30% searched for X in-app" | Moderate signal (observed need) |
| 5 | Controlled experiment | "Fake door got 12% click rate" | Strong signal (causal) |
| 6 | Replicated results | "A/B confirmed across 3 segments" | Strongest (proven) |

## Decision Thresholds

| Decision Type | Minimum Evidence Level | Notes |
|---------------|----------------------|-------|
| Add to backlog | 2 (stakeholder + data) | Low cost to track |
| Prioritize for discovery | 3 (survey or analytics) | Worth investigating |
| Build prototype | 4 (behavioral signal) | Invest design time |
| Build MVP | 5 (experiment success) | Commit eng resources |
| Scale / GA release | 5-6 (experiment + retention) | Full investment |
| Kill initiative | 5 (experiment failure) | Strong negative signal sufficient |

## Rules

- Never ship based solely on Level 1-2 evidence for non-trivial features
- Level 3 (surveys) overstates demand by 3-5x - discount accordingly
- Level 4 (behavioral) is necessary but not sufficient - shows need, not solution fit
- Level 5 (experiment) required before significant engineering investment
- Stated preference ("I would use X") is Level 3 at best - treat with skepticism
- Negative evidence is as valuable as positive - kills bad ideas cheaply
- Ask about specific past behavior, not hypothetical futures (Mom Test core rule)
- Commitment signals validate interest: time (will they schedule follow-up?), money (will they pre-pay?), reputation (will they refer others?)
- AI-generated insights (L1.5) useful for hypothesis generation at scale but never sufficient alone

## Labeling Convention

When citing evidence in documents:
```
[L1-opinion] "Team believes..."
[L3-survey] "45% of respondents..."
[L4-behavioral] "Usage data shows..."
[L5-experiment] "Fake door: 8% conversion (n=500)"
```

## Attribution

Note: this hierarchy is a synthesis from multiple sources (Lean Startup, Torres, scientific method), not attributed to any single author.
