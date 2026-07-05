---
type: subskill
title: "DAG Design"
---

# DAG Design

## Core Concepts

- A DAG (Directed Acyclic Graph) models task dependencies  -  arrows show data flow, not time
- Each node should be idempotent: running it twice produces the same result
- Granularity matters: too coarse = slow reruns; too fine = scheduling overhead
- DAGs should be deterministic: same inputs always produce same outputs regardless of run time
- Naming conventions and structure should communicate intent without reading code

## Key Practices

- One DAG per logical pipeline or business process  -  don't overload a single DAG
- Use meaningful task IDs: `extract_orders`, not `task_1`  -  debugging at 3am demands clarity
- Define clear data contracts between tasks: schema, format, location
- Separate environment config from DAG logic  -  same DAG runs in dev and prod
- Add sensors or checks at boundaries: verify upstream data exists before transforming

## Common Mistakes

- Creating circular dependencies through shared state outside the DAG framework
- Hardcoding paths, dates, or credentials inside task definitions
- Making every task depend on every other task  -  creating false sequential bottlenecks

## When to Apply

- Building batch data pipelines with multiple dependent transformation steps
- Migrating cron jobs to a proper orchestration framework
- Pipeline failures are hard to diagnose because task boundaries are unclear
- Need to add monitoring, retries, or partial reruns to existing data workflows
