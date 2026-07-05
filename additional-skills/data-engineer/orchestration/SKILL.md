---
name: orchestration
description: "Workflow orchestration: Dagster (asset-based), Airflow (legacy), Prefect, scheduling, backfills"
---

# Orchestration Expert

Workflow orchestration for data pipelines. Dagster preferred for new projects, Airflow for legacy, Prefect for simplicity.

## Scope

- Orchestrator selection: Dagster (asset-based), Airflow (task-based), Prefect (flow-based)
- DAG/asset design, dependency management, scheduling
- Backfill strategies and partition management
- Alerting, retries, SLA monitoring
- Resource management and executor configuration
- CI/CD for pipeline definitions
- Multi-environment deployment (dev/staging/prod)

## First Action

1. Check existing orchestration tool in the codebase (imports, config files, Docker services)
2. Identify pipeline topology: linear, fan-out, diamond dependencies
3. Determine scheduling requirements (cron, event-driven, sensor-based)
4. Review existing failure handling and retry configuration

## Constraints

1. Dagster for new projects: asset-based model maps naturally to data products; prefer over task-based DAGs.
2. Every pipeline must be idempotent; re-running a partition produces identical output.
3. Backfill must be partition-aware; never backfill by re-running the entire pipeline history sequentially.
4. Use sensors/triggers over fixed schedules when upstream data arrival is unpredictable.
5. Separate pipeline definition from execution environment; definitions are code, infrastructure is config.
6. Retries must have exponential backoff and a max attempts cap (typically 3); never infinite retries.
7. SLA monitoring required for all production pipelines; alert on late materialization, not just failure.
8. Airflow: use TaskFlow API (decorators) over classic operators for Python tasks; keep DAG files thin.
9. Dagster: define IO managers per environment; never hardcode storage paths in asset code.
10. Pipeline tests must run without the orchestrator; extract transform logic into testable functions.
11. Schedule intervals must account for upstream latency; don't trigger before data is ready.
12. Use tags/labels for pipeline ownership, priority, and cost center attribution.
13. Prefer event-driven triggers (Dagster sensors, Airflow dataset triggers) over polling for cross-pipeline deps.
14. Deployment must be atomic; never partially update pipeline definitions in production.

## DO NOT

- Put business logic inside DAG/asset definitions; extract into importable modules
- Use dynamic task generation without bounding the maximum task count
- Schedule pipelines more frequently than data actually changes
- Mix orchestration concerns with data transformation logic
- Use Airflow XCom for large data transfer; use external storage (S3, GCS)
- Skip partition metadata when backfilling; it breaks lineage and observability
- Deploy pipeline changes without testing DAG/asset parsing in CI
- Run development pipelines against production data sources without isolation
- Use the orchestrator's database as a data store; it is for metadata only

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL transformations in pipelines | `../sql` |
| dbt integration with orchestrator | `../modeling` |
| Data quality checks in DAGs | `../quality` |
| Streaming ingestion triggers | `../streaming` |
| Pipeline design patterns | `../pipeline` |

## Verification

- DAG/asset graph parses without errors in CI
- Backfill of historical partition produces correct output matching forward-fill
- Retry logic triggers correctly on simulated failures
- SLA alerts fire within defined latency threshold
- Pipeline runs are idempotent (re-run produces same output)
- Cross-pipeline dependencies resolve correctly (sensor/trigger fires on upstream completion)

## Knowledge

- `knowledge/dagster.md` -- assets, resources, IO managers, sensors, partitions, Dagster+
- `knowledge/airflow.md` -- TaskFlow, providers, connections, datasets, executors
- `knowledge/prefect.md` -- flows, tasks, deployments, work pools, automations
- `knowledge/scheduling.md` -- cron patterns, partition schemes, SLA calculation

## AI-Era Context (2026)

- Dagster is the default for greenfield data platforms; asset lineage maps directly to business data products
- Airflow 3.x (2025+) adds asset-aware scheduling and improved backfill UX; evaluate before migrating away
- Prefect 3.x removes the server requirement for simple workflows; good for small team adoption
- AI-generated DAGs require validation of dependency correctness; LLMs often get execution order wrong
- Orchestrators increasingly integrate with data catalogs for automatic lineage and discovery
- GitOps-based deployment (branch = environment) is standard for pipeline CI/CD

## Related Skills

- `data-engineer/pipeline` -- pipeline architecture patterns
- `data-engineer/modeling` -- dbt orchestration integration
- `data-engineer/quality` -- quality checks as pipeline steps
- `system-design` -- distributed system scheduling patterns
