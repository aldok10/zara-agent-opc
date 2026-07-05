# Kanban Metrics

## Little's Law

`Avg Cycle Time = WIP / Throughput`

Only valid when: system is stable, arrival rate ~ departure rate, no abandoned items.
Use for: capacity planning, WIP limit setting, predictability forecasting.

## Cycle Time

Time from work started to work completed (not created to completed).

**Percentile analysis**:
- P50: typical item completion time
- P70: moderate confidence threshold
- P85: SLE (Service Level Expectation)  -  promise to stakeholders
- P95: outlier threshold; investigate anything above

**Scatterplot reading**:
- Standard percentile lines: 50%, 70%, 85%, 95% (per Vacanti/ActionableAgile)
- Cluster = stable process
- Upward trend = deteriorating flow
- Outliers above P85 = immediate action items
- Seasonal patterns = plan for known surges

## Throughput

Items completed per unit time (week recommended).

**Rules**:
- Count only done items (DoD met)
- Use rolling 4-week average for planning
- Throughput distribution enables probabilistic forecasting
- Monte Carlo: sample from historical throughput for "how many sprints to finish N items"

## WIP Age

Current age of in-progress items (today - start date).

**Thresholds**:
- Below P50 cycle time: healthy, no action
- Between P50-P85: monitor, may need help
- Above P85: immediate action  -  blocked, scope creep, or needs splitting
- Above P95: escalate, likely needs removal or complete rework

**Daily check**: Sort WIP by age descending. Top items get attention first.

## Cumulative Flow Diagram (CFD)

**Reading**:
- Parallel bands = stable WIP, healthy flow
- Widening band = growing WIP in that state (bottleneck)
- Narrowing band = WIP draining (starvation downstream)
- Flat "done" line = throughput drop
- Vertical distance between bands = WIP in that state
- Horizontal distance = approximate cycle time

**Actions from CFD**:
- Widening → reduce inflow or add capacity at bottleneck
- Flat done → check blocked items, remove impediments
- Oscillating → system unstable, tighten WIP limits

## WIP Limits

**Setting initial WIP**: Start with current average WIP. Reduce by 1 per column every 2 weeks until pain surfaces. Pain = improvement signal.

**Column policies**: Each column needs explicit entry/exit criteria.

**Violation protocol**: WIP exceeded → team swarms to finish before pulling new work. WIP limits are essential enabling constraints, collaboratively agreed and adjustable by the team. Chronic violations signal systemic issues.

## Service Level Expectations (SLE)

Definition (Kanban Guide 2025): "A forecast of how long it should take a work item to flow from started to finished. Two parts: a period of elapsed time and a probability (e.g., '85% of work items will be finished in eight days or less'). Based on historical cycle time."

Default: 85th percentile cycle time.
Publish to stakeholders. Review monthly.
If SLE missed >15% of items: systemic issue, not individual failure.

## Kanban Practices

The Kanban Guide (2025, co-authored by Vacanti) defines 3 practices:
1. Defining and Visualizing the Workflow
2. Actively Managing Items in a Workflow
3. Improving the Workflow

Anderson's Kanban Method defines 6 general practices: Visualize, Limit WIP, Manage Flow, Make Policies Explicit, Implement Feedback Loops, Improve Collaboratively. The Guide's 3 subsume Anderson's 6.

## Four Mandatory Flow Metrics (Kanban Guide)

1. **WIP**  -  foundational; control it first
2. **Throughput**  -  items completed per time period
3. **Work Item Age**  -  leading indicator for in-progress items
4. **Cycle Time**  -  started to finished
