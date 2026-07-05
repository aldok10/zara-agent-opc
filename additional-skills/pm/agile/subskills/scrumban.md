# Scrumban

## What It Is

Hybrid: Scrum's cadence + Kanban's flow principles. Pull-based work within optional time-boxes. Best of both without dogma.

## When to Use

- Team outgrowing Scrum: sprints feel artificial, continuous delivery ready
- Support/ops teams: unpredictable work + planned improvements
- Transition from Scrum to Kanban (gradual, not big-bang)
- Teams doing both project work + BAU/maintenance

## Core Rules

1. WIP limits per column (non-negotiable, same as Kanban)
2. Pull-based: team pulls when capacity available, not pushed at sprint start
3. On-demand planning: trigger when "ready" column drops below threshold
4. Optional iterations: keep sprint cadence for review/retro only, not commitment
5. Continuous flow: no artificial start/stop of work items
6. Classes of service: expedite, fixed-date, standard, intangible

## Transition from Scrum

**Week 1-2**: Add WIP limits to existing sprint board. Observe.
**Week 3-4**: Start tracking cycle time. Keep sprints.
**Week 5-6**: Move to pull-based (team pulls when done, not at planning).
**Week 7-8**: Planning becomes on-demand (triggered by "ready" threshold).
**Week 9+**: Evaluate: keep sprint review/retro cadence, drop sprint commitment.

**Key**: Start with current WIP as initial limit. Tighten over time.

## WIP Limit Setting

- Initial: count current average items in-progress per column
- Target: reduce by 1 every 2 weeks until team feels healthy tension
- Formula heuristic: team size - 1 for "In Progress" column
- Expedite lane: always 1 (forces prioritization)

## On-Demand Planning

Trigger: "Ready" column has fewer items than team can complete in 1 week.
Session: 30min max. PO presents top candidates, team pulls based on capacity.
No sprint commitment. Replenish meeting replaces sprint planning.

## Board Design

```
| Backlog | Ready (3) | In Progress (4) | Review (2) | Done |
|         |           | Dev | Test       |            |      |
```

Expedite lane (swim lane, 1 WIP): crosses all columns, takes priority.

## Metrics to Track

- Cycle time (primary)  -  P50/P70/P85/P95
- Throughput (weekly)
- WIP age (daily check)
- Blocker clustering (which columns accumulate blocks)
- Lead time (for stakeholder SLEs)

## Anti-patterns

- Adding WIP limits but never enforcing them
- Keeping sprint commitment AND pull-based (contradictory)
- No planning trigger: "ready" column empties, team starves
- Treating all work same priority (no classes of service)
- Reverting to Scrum under pressure instead of trusting flow
