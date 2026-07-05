---
type: subskill
title: "Game Day Facilitation"
---

# Game Day Facilitation

## Planning Timeline

**1 week before**:
- Define experiments and hypotheses (max 3-4 per game day)
- Identify participating teams and assign roles
- Notify stakeholders (SRE, on-call, customer support)
- Prepare runbooks for each experiment
- Verify rollback mechanisms work
- Confirm monitoring dashboards are ready

**Day before**:
- Final go/no-go based on system health
- Distribute runbook links and communication channels
- Confirm all participants available

**Day of**:
- Pre-check: verify steady state baseline (15 min)
- Execute experiments sequentially with recovery time between
- Real-time documentation of observations
- Debrief within 1 hour of completion

## Roles

| Role | Responsibility |
|---|---|
| Experiment Lead | Executes injection, monitors blast radius, calls abort |
| Observer(s) | Watch dashboards, note anomalies, capture screenshots |
| Communicator | Updates stakeholders, manages escalations |
| Scribe | Documents timeline, findings, surprises in real-time |

Minimum team: 3 people (lead + observer + communicator/scribe).

## Communication Plan

- **Before**: Email/Slack to engineering, SRE, support teams
- **During**: Dedicated Slack channel, status updates every 15 min
- **Escalation**: Direct page to on-call if abort triggered
- **After**: Summary to all stakeholders within 24 hours

Template message: "Game Day in progress. [Environment]. Experiments: [list]. Expected impact: [none/minimal]. Contact: [lead name]. Channel: #game-day-[date]"

## Experiment Runbook Template

```markdown
## Experiment: [Name]
Hypothesis: [When X, system maintains Y within Z]
Target: [Service/infrastructure]
Injection method: [Tool + config]
Duration: [Time window]
Blast radius: [Scope]
Abort conditions: [Specific thresholds]
Rollback command: [Exact command]
Monitoring: [Dashboard links]
```

## Debrief Format

Conduct within 1 hour while memory is fresh:

1. **What broke**: Services, features, or metrics that degraded
2. **What held**: Systems that performed as expected
3. **Surprises**: Unexpected behaviors (positive or negative)
4. **Detection time**: How long until monitoring alerted
5. **Recovery time**: How long to restore steady state
6. **Root causes**: Why failures occurred

## Action Items

Categorize by priority:
- **P1**: Immediate fix needed (data loss risk, no alerting)
- **P2**: Fix within sprint (degraded resilience, slow recovery)
- **P3**: Backlog (improvements, nice-to-haves)

Common action types:
- Runbook updates (missing steps, wrong commands)
- Alert tuning (missing alerts, noisy false positives)
- Architecture fixes (missing retries, no circuit breakers)
- Monitoring gaps (missing dashboards, wrong thresholds)

## Metrics to Capture

During experiment:
- Time to detection (when did alerts fire?)
- Time to mitigation (when did team act?)
- Time to recovery (when did steady state return?)
- Error rate delta from baseline
- Latency impact (p50, p95, p99 changes)
- Customer impact (failed requests, error pages served)
- Business metric impact (orders/min, conversion rate)

After game day:
- Number of experiments run vs planned
- Pass/fail ratio of hypotheses
- Action items generated (count and severity)
- Comparison to previous game day results

## Rules

- Never skip the debrief - it's where the value is
- Maximum 4 experiments per game day (fatigue degrades observation)
- Recovery period between experiments (minimum 10 min steady state)
- Cancel if production is already unhealthy
- Document everything, even "boring" results
- Share findings broadly - resilience is a team sport
