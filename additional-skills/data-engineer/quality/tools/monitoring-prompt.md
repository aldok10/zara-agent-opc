---
type: tool
title: "Data Quality Monitoring Setup Prompt"
---

# Data Quality Monitoring Setup Prompt

Use this prompt to design a data quality monitoring system with checks, alerts, and dashboards.

## Prompt

```
You are a data engineer setting up data quality monitoring for production pipelines. Design a system that catches issues early and provides visibility.

Input:
- Data assets: [tables, datasets, pipelines to monitor]
- Current state: [existing checks, known issues, blind spots]
- Tools available: [Great Expectations/dbt tests/Soda/Monte Carlo/custom]
- Alert channels: [Slack/PagerDuty/email]
- Team structure: [who owns data quality? who responds to alerts?]
- SLAs: [freshness requirements, accuracy expectations]

Design the monitoring system covering:

1. CHECK CATEGORIES
   Freshness:
   - Table last updated within expected window
   - Record timestamps within expected range (no future dates, no stale data)
   - Pipeline completion time within SLA

   Volume:
   - Row count within expected range (vs historical baseline, day-of-week pattern)
   - No unexpected zero-row tables after pipeline runs
   - Growth rate within bounds (sudden spikes or drops)

   Schema:
   - Column count and names match expectation
   - Data types haven't changed
   - New unexpected columns detected

   Completeness:
   - Null rate per column within threshold
   - Required fields are populated
   - No missing partitions or date gaps

   Uniqueness:
   - Primary key uniqueness holds
   - No unexpected duplicates in business keys
   - Deduplication logic is effective

   Validity:
   - Values within defined ranges (min/max, enum membership)
   - Referential integrity across tables
   - Business rule compliance (derived fields match formula)
   - Pattern matching (email format, phone format, etc.)

   Distribution:
   - Statistical properties stable (mean, stddev, percentiles)
   - Categorical distributions not shifted
   - Anomaly detection on key metrics

2. CHECK IMPLEMENTATION
   - Where to run: in-pipeline (blocking) vs post-pipeline (alerting)
   - Frequency: every run, hourly, daily
   - Thresholds: hard fail vs warning vs info
   - Historical comparison: compare to last N runs, same day last week
   - Custom expressions for domain-specific rules

3. ALERTING STRATEGY
   - Severity classification:
     - P1: data serving customers is incorrect (immediate page)
     - P2: SLA breach or significant quality degradation (Slack + owner)
     - P3: drift detected, action needed within 24h (daily digest)
     - P4: informational anomaly (dashboard only)
   - Alert fatigue prevention:
     - Group related failures into single alert
     - Suppress repeated alerts for same issue
     - Auto-resolve when issue clears
   - Routing: who gets which severity, escalation after N minutes

4. DASHBOARD DESIGN
   - Overview: health score per data asset (green/yellow/red)
   - Trend: quality metrics over time (are we improving or degrading?)
   - Detail: drill into specific check results, failure history
   - SLA tracker: freshness and completeness vs commitment
   - Incident log: recent failures, resolution status, time-to-fix

5. REMEDIATION WORKFLOW
   - Auto-remediation: what can be fixed without human intervention?
   - Runbook per check type: what to do when it fires
   - Root cause tracking: link quality issues to pipeline changes
   - Feedback loop: post-incident learning, threshold tuning

Output format:
- Check inventory: table | check type | expression | threshold | severity | frequency
- Alert routing matrix: severity | channel | recipient | escalation
- Dashboard wireframe: sections and key metrics
- Implementation plan: tool choice, setup steps, timeline
- Maintenance cadence: how often to review and tune thresholds
```
