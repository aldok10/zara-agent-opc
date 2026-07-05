---
name: team-health
description: "Team health: DORA, DevEx, team topologies, cognitive load"
---

# Team Health

## Scope

Measure, diagnose, and improve engineering team effectiveness. Track delivery performance (DORA), developer experience (DevEx), team structure fitness, and cognitive load sustainability.

## Core Principles

1. Track trends over absolutes. Compare team to own baseline, not other teams.
2. DORA metrics are leading indicators for organizational performance and employee well-being.
3. DevEx = flow state + cognitive load + feedback loops. All three matter.
4. Team Topologies: minimize cognitive load per team via clear boundaries.
5. Team size 5-8 (two-pizza). Larger = split by domain.
6. Allocation target: 70% features, 15-20% tech debt, 10-15% innovation.
7. On-call load must be balanced and sustainable (<1 week/month per person).
8. Internal developer platform reduces extraneous cognitive load.
9. Survey quarterly, 5-7 questions, always tie to actions.
10. Reorganize only with evidence: persistent delivery slowdown + cognitive overload.

## DO NOT

1. Compare teams to each other using DORA (context differs).
2. Use metrics as performance evaluation for individuals.
3. Survey without committing to act on results.
4. Reorganize teams without cognitive load evidence.
5. Optimize one DORA metric at expense of others (they correlate).

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| "deploy frequency", "lead time", "failure rate", "recovery time", "rework rate" | dora-metrics |
| "survey", "flow state", "developer experience", "feedback loops" | devex-survey |
| "team structure", "platform team", "stream-aligned", "interaction" | team-topologies |
| "cognitive load", "overload", "burnout", "onboarding slow" | cognitive-load |

## Decision Matrix

| Situation | Action |
|-----------|--------|
| DORA metrics declining | Identify bottleneck metric, apply targeted lever |
| DevEx survey scores drop | Prioritize top-2 complaints in next sprint |
| Team >8 people | Assess domain boundaries, plan split |
| Onboarding >3 months | Cognitive overload signal, reduce scope |
| On-call burnout | Rebalance rotation, invest in reliability |
| Cross-team deps blocking | Evaluate X-as-a-Service interaction mode |

## DORA Metrics (2024 Grouping)

### Throughput
- **Deploy frequency**: how often code reaches production
- **Lead time for changes**: commit to production
- **Failed deployment recovery time**: time to restore service after failed deployment

### Instability
- **Change failure rate**: % deployments causing incidents/rollbacks
- **Deployment rework rate** (5th metric, added 2024): ratio of deployments that are unplanned but happen as a result of an incident in production

## DORA Benchmarks

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deploy freq | On-demand (multiple/day) | Weekly-monthly | Monthly-6mo | >6mo |
| Lead time | <1 day | 1d-1wk | 1-6mo | >6mo |
| Change failure | 0-15% (elite average ~5%) | 10-15% | 16-30% | >30% |
| Failed deployment recovery time | <1 hour | <1 day | 1d-1wk | >1 week |

## Verification

- Assessment includes all 5 DORA metrics with current values
- DevEx covers all 3 dimensions (flow, load, feedback)
- Recommendations tied to specific evidence, not assumptions
- Actions are concrete, time-bound, assignable
- Trend comparison against previous quarter included

## AI-Era Context (2026)

DORA metrics are auto-collected from CI/CD pipelines -- deploy frequency, lead time, change failure rate, and recovery time stream in real-time. DevEx surveys are AI-analyzed for sentiment, trend detection, and theme extraction across teams. AI surfaces correlations (e.g., cognitive load spike after reorg, flow state drop during on-call). However, action items remain human-owned: AI identifies the signal, humans decide the intervention. Risk: over-indexing on metrics without understanding lived team experience.

## Knowledge

- `knowledge/dora-benchmarks.md` -- DORA benchmark table and improvement levers
- `knowledge/survey-templates.md` -- DevEx survey questions and templates
