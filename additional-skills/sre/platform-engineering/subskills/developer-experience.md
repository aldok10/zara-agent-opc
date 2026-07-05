---
type: subskill
title: "Developer Experience"
---

# Developer Experience

DX metrics, friction reduction, and tooling for developer productivity.

## When to Load
- Measuring developer productivity and satisfaction
- Identifying and removing friction in developer workflows
- Choosing and evaluating platform tooling
- Making the case for developer experience investment

## Key Concepts

**DORA metrics:**
- Deployment Frequency: how often code ships to production
- Lead Time for Changes: commit to production time
- Change Failure Rate: % deployments causing incidents
- Time to Restore: how long to recover from failure

**SPACE framework (Microsoft Research):**
- Satisfaction and well-being
- Performance (outcome, not output)
- Activity (counts: deploys, PRs, commits)
- Communication and collaboration
- Efficiency and flow

**Developer friction categories:**
- Cognitive load: too many decisions, unclear ownership
- Wait time: CI, reviews, provisioning, approvals
- Context switching: oncall, meetings, multi-repo workflows
- Toil: repetitive manual tasks that could be automated

## Patterns

**DX measurement approach:**
```
Quantitative (tools):
  - CI pipeline duration (p50, p95)
  - Time to first commit (new joiner)
  - PR review turnaround time
  - Environment provisioning time
  - Build cache hit rate

Qualitative (surveys):
  - Quarterly DX survey (10 questions max)
  - "How easy is it to ship a change?" (1-5)
  - "What slows you down most?" (free text)
  - eNPS for internal tools
```

**Friction log (template for identifying issues):**
```markdown
## Friction Log: [workflow name]
Date: YYYY-MM-DD
Developer: [name]

### Steps Taken
1. [action] -- [time spent] -- [friction: none/minor/major]
2. [action] -- [time spent] -- [friction: none/minor/major]

### Pain Points
- [describe specific friction]
- [describe specific friction]

### Suggested Improvements
- [actionable improvement]
```

**Internal CLI (platform tooling pattern):**
```bash
# Single CLI for common operations
platform create service --template=go --name=my-service
platform deploy --env=staging --service=my-service
platform logs --service=my-service --env=prod --since=1h
platform secret set --service=my-service --key=DB_URL
platform status --service=my-service
```

## Gotchas
- Measuring lines of code or PRs/day incentivizes gaming, not productivity
- DX improvements without measurement are hard to justify to leadership
- Developer surveys with >15 questions get low response rates
- Internal tools without documentation suffer same adoption problems as external ones
- "Build vs buy" for platform tools: buy when commodity, build when differentiating
- One-size-fits-all platforms frustrate senior engineers -- provide escape hatches

## Verification
- Track DORA metrics monthly (use DORA team's quick check)
- Measure CI pipeline duration trends (should decrease or stay flat)
- Time from "ticket created" to "code in production"
- Survey response rates >60% indicate engagement
- Adoption rate of new platform features (target 80% within quarter)
- Support ticket volume for platform team (should trend down)
