---
type: tool
title: "DAG Failure Handling Design Prompt"
---

# DAG Failure Handling Design Prompt

Use this prompt to design failure handling, retry logic, and alerting for data pipeline DAGs.

## Prompt

```
You are a data engineer designing failure handling for a production DAG. Ensure the pipeline recovers gracefully, alerts appropriately, and supports partial re-execution.

Input:
- Orchestrator: [Airflow/Dagster/Prefect/dbt/custom]
- DAG structure: [describe tasks and dependencies, or paste DAG definition]
- SLA: [when must this pipeline complete by?]
- Data characteristics: [idempotent sources? append-only? stateful transforms?]
- Current pain points: [silent failures, cascade retries, alert fatigue, manual recovery]
- Downstream consumers: [who is waiting on this data?]

Design failure handling covering:

1. RETRY STRATEGY PER TASK
   - Transient failures (network, throttling): retry with exponential backoff
   - Data failures (missing source, bad schema): no retry, alert immediately
   - Resource failures (OOM, timeout): retry with increased resources or reduced batch
   - For each task type:
     - Max retries: [number]
     - Retry delay: [seconds, exponential factor]
     - Retry condition: [which exceptions trigger retry vs immediate fail]

2. ALERTING DESIGN
   - Alert levels:
     - INFO: task retrying (no action needed)
     - WARNING: task failed after retries, downstream impacted
     - CRITICAL: SLA breach imminent or data quality check failed
   - Alert routing: who gets which level? (Slack channel, PagerDuty, email)
   - Alert content: task name, failure reason, run ID, link to logs, suggested action
   - Alert suppression: avoid duplicate alerts for cascade failures
   - SLA monitoring: alert at 80% of SLA window if still running

3. PARTIAL RE-RUN SUPPORT
   - Task isolation: can each task be re-run independently?
   - Idempotency: will re-running a task produce the same result? If not, what's needed?
   - Checkpoint design: where does the pipeline save progress?
   - Clear failed state: what needs resetting before retry? (temp files, locks, partial writes)
   - Backfill support: can the pipeline re-process a specific date range?

4. CASCADE FAILURE PREVENTION
   - Dependency failure: should downstream tasks wait, skip, or use stale data?
   - Circuit breaker: after N consecutive failures, pause the DAG (not just the task)
   - Blast radius containment: can failing branches be isolated from healthy ones?
   - Timeout per task: prevent hung tasks from blocking the entire DAG
   - Resource isolation: ensure one task's resource usage doesn't starve others

5. RECOVERY PROCEDURES
   - Automated recovery: self-healing patterns (re-create temp tables, refresh tokens)
   - Manual recovery runbook: step-by-step for common failure modes
   - Data reconciliation: how to verify data consistency after manual intervention
   - Post-incident: how to determine if downstream data was affected

Output format:
- Task failure matrix: task | failure type | retry config | alert level | recovery action
- Alert routing table: level | channel | recipient | escalation after
- Partial re-run guide: task | idempotent? | prerequisites | command to re-run
- Circuit breaker configuration
- Recovery runbook outline (top 5 failure scenarios)
- Monitoring dashboard requirements (metrics to track)
```
