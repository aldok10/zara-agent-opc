# Agile Metrics Quick Reference

## Cycle Time

- Definition: work started → work completed
- Percentiles: P50 (typical), P70 (moderate confidence), P85 (SLE), P95 (outlier)
- Good: decreasing or stable P85 over time
- Bad: upward trend, widening P50-P95 gap

## Throughput

- Definition: items completed per time period (use weeks)
- Calculation: count done items with DoD met per week
- Use: Monte Carlo forecasting, capacity planning
- Rolling 4-week average smooths variance

## Velocity (Scrum only)

- Definition: story points completed per sprint
- Calculation: sum of points for done stories (DoD met)
- Use: sprint planning capacity ONLY
- NOT for: comparing teams, performance reviews, commitments to stakeholders
- Rolling 3-sprint average for planning

## WIP Age

- Definition: today - date work started (for in-progress items)
- Healthy: below P50 historical cycle time
- Warning: between P50-P85
- Action: above P85  -  investigate immediately
- Critical: above P95  -  escalate/split/remove

## Burn-down Chart

- Shows: remaining work vs time in sprint
- Ideal line: straight diagonal from total to zero
- Above ideal: behind schedule
- Below ideal: ahead (or scope reduced)
- Flat line: blocked work, investigate

## Burn-up Chart

- Shows: total scope + completed work over time
- Scope line rising: scope creep visible
- Done line flat: throughput problem
- Gap between lines: remaining work
- Better than burn-down for scope change visibility

## Cumulative Flow Diagram

- X-axis: time. Y-axis: item count. Bands: workflow states
- Parallel bands: stable, healthy flow
- Widening band: bottleneck (WIP growing in that state)
- Flat done band: throughput stopped
- Vertical slice width: WIP at that time
- Horizontal slice width: approximate cycle time

## Key Formulas

```
Cycle Time (avg) = WIP / Throughput          [Little's Law]
Throughput       = Done items / Time period
WIP              = Items started but not done
Lead Time        = Created → Completed (includes queue time)
Flow Efficiency  = Active time / Total cycle time × 100%
```

## Healthy Targets

| Metric | Target |
|--------|--------|
| Flow Efficiency | 15-40% (most orgs 15%, world-class 40%) |
| SLE hit rate | >85% items within P85 cycle time |
| WIP:Throughput | Ratio stable week-over-week |
| Sprint goal met | >80% of sprints |
| Escaped defects | Trending down quarter-over-quarter |
| Rework rate | <15% of throughput |
| Sprint goal completion | >80% |
| Scope change rate | <10% mid-sprint |

## Rework Rate (DORA 2024 Stability Metric)

- Definition: % of items re-entering "in progress" after reaching "done" or "review"
- Formula: `rework_items / total_completed * 100`
- Target: <15%. Above 25% = systemic quality issue
- Track separately for AI-generated vs human-written code
- Leading indicator of escaped defects

## Scope Change Rate

- Definition: items added/removed after sprint start / original sprint scope
- Formula: `(added + removed) / committed_at_start * 100`
- Target: <10%. Above 20% = planning failure or priority instability
- Track cause: emergency, stakeholder change, discovery, poor refinement
- Correlates with DORA burnout findings on unstable priorities

## Sprint Goal Completion Rate

- Binary per sprint: goal met = 1, missed = 0
- Rolling 6-sprint rate. Target: >80%
- Below 60%: goals too ambitious or too many mid-sprint disruptions
- Separate from velocity  -  goal can be met without finishing all stories

## INVEST Criteria (User Story Quality)

| Letter | Meaning | Test |
|--------|---------|------|
| I | Independent | No blocking dependency on other stories |
| N | Negotiable | Implementation flexible, outcome fixed |
| V | Valuable | Delivers user/business value alone |
| E | Estimable | Team can size it (not too vague) |
| S | Small | Fits in single sprint with margin |
| T | Testable | Clear pass/fail acceptance criteria |

Stories failing 2+ criteria → send back to refinement.

## WIP as Foundation

WIP is foundational (control it first), then Throughput and Cycle Time become meaningful. Work Item Age is the leading indicator for in-progress items.

## Flow Diagnostic Rule

> If cycle time > 2x lead time, you have a flow problem not a capacity problem.

Meaning: items spend more time waiting than being worked on. Fix: reduce WIP, remove handoffs, eliminate approval queues.
