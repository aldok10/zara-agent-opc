---
type: tool
title: "Health Dashboard Template"
---

# Health Dashboard Template

## Prompt Template

Generate a team health dashboard for [TEAM_NAME] covering:

### DORA Metrics (source: CI/CD pipeline + incident tracker)
- Deploy frequency: [X] deploys/week (level: [elite/high/medium/low])
- Lead time: [X] days median (level: [])
- Change failure rate: [X]% (level: [])
- Recovery time: [X] hours median (level: [])
- Trend vs last quarter: [improving/stable/declining]

### DevEx Scores (source: quarterly survey)
- Flow state: [X.X]/5 (delta: [+/-X.X])
- Cognitive load: [X.X]/5 (delta: [+/-X.X])
- Feedback loops: [X.X]/5 (delta: [+/-X.X])
- Response rate: [X]%
- Top concern: [theme]

### Team Metrics (custom)
- Team size: [X] (target: 5-8)
- Services owned: [X] (target: <5)
- On-call load: [X] days/person/month (target: <7)
- Allocation: [X]% features / [X]% debt / [X]% innovation
- Open incidents: [X] (age: [avg days])

### Health Status
- Overall: [Healthy / Watch / Action Required]
- Top risk: [description]
- Recommended action: [specific, time-bound]

## Usage

Fill template monthly. Flag any metric crossing threshold. Present quarterly to leadership with trend lines and actions taken.
