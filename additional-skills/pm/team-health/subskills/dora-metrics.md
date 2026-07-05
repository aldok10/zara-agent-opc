---
type: subskill
title: "DORA Metrics"
---

# DORA Metrics

## Scope

Measure and improve the five key metrics of software delivery performance (2024 structure).

## Throughput Metrics

### Deploy Frequency
How often code reaches production. Measure: deploys/week to prod.
- Improve: smaller batches, feature flags, trunk-based dev, CI/CD automation.
- Blocker: manual approval gates, large PRs, env contention.

### Lead Time for Changes
Commit to production. Measure: median time first-commit → deploy.
- Improve: reduce PR review time, parallelize CI, auto-deploy on merge.
- Blocker: long-lived branches, slow tests, manual QA gates.

### Failed Deployment Recovery Time
Time to restore service after a failed deployment. Measure: median minutes from detection to service restored.
- Improve: runbooks, observability, feature flags for kill-switch, blameless postmortems.
- Blocker: no alerting, complex rollback, unclear ownership.

## Instability Metrics

### Change Failure Rate
% deployments causing incidents/rollbacks. Measure: failed deploys / total deploys.
- Improve: test coverage, canary deploys, progressive rollouts, pre-prod parity.
- Blocker: no staging, poor test isolation, missing observability.

### Deployment Rework Rate (5th metric, added 2024)
Ratio of deployments that are unplanned but happen as a result of an incident in production.
- Improve: pre-prod parity, integration testing, canary deploys, observability.
- Blocker: poor upstream quality, insufficient staging, missing monitoring.

## Measurement Cadence

- Track monthly. Report quarterly. Compare to own 3-month rolling average.
- Source data from CI/CD pipeline + incident tracker. Automate collection.

## Metric Relationships

- Deploy freq ↑ enables lead time ↓ (smaller batches move faster).
- Smaller changes → lower failure rate (less risk per deploy).
- Fast recovery decouples from failure rate (fail fast, recover fast).
- All five metrics improve together. Optimizing one at expense of others = anti-pattern.

## Assessment Questions

1. Can you deploy any commit to prod within 1 hour if needed?
2. What % of PRs merge same day they're opened?
3. Last 10 deploys: how many required rollback/hotfix?
4. Last 3 failed deployments: time from detection to service restored?
5. Last 20 deploys: how many were unplanned rework due to production incidents?

## Improvement Priority

Low → Medium: automate deployment pipeline, add basic monitoring.
Medium → High: trunk-based dev, reduce batch size, improve test coverage.
High → Elite: continuous deployment, feature flags, <15 min CI.

## Key Research Findings

DORA metrics are leading indicators for organizational performance and employee well-being.

Note: DORA 2024 restructured metrics into throughput (deploy frequency, lead time, failed deployment recovery time) and instability (change failure rate, deployment rework rate) rather than the legacy throughput/stability split.

**AI Impact (DORA 2024)**: "AI adoption significantly increases individual productivity, flow, and job satisfaction. However, it also negatively impacts software delivery stability and throughput."
