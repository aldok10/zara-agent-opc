# Hypothesis Design

## Hypothesis Template

> "When [fault condition X] occurs, the system maintains [observable behavior Y] within [tolerance Z]."

Examples:
- "When the payment service has 500ms added latency, checkout completes within 3s and no orders are lost."
- "When 1 of 3 database replicas is unreachable, read queries succeed with <100ms added p99 latency."
- "When the cache layer is completely unavailable, the API responds from origin with <2s latency and zero 5xx errors."

## Steady State Definition

Define "normal" using SLIs before injecting chaos:
- **Availability**: Success rate of requests (e.g., 99.9% 2xx responses)
- **Latency**: p50, p95, p99 response times
- **Throughput**: Requests per second within expected range
- **Error rate**: Baseline error percentage (should be near zero)
- **Business metrics**: Orders/min, messages processed/sec

Capture steady state for at least 10 minutes before experiment starts.

## Measurable Predictions

Bad: "The system should handle failures gracefully."
Good: "Error rate stays below 0.1%, p99 latency stays under 800ms, zero data loss."

Every prediction must have:
- A metric name (what you measure)
- A threshold (the number that defines pass/fail)
- A measurement window (how long you observe)

## Scope Boundaries

**In scope**: Services, infrastructure, and failure modes directly tested.
**Out of scope**: Dependent systems not being tested, failure modes beyond current maturity.

Document explicitly:
- Which services are targets
- Which environments (never production without approval chain)
- Which users/traffic affected (canary %, shadow traffic)
- Time window for the experiment

## Blast Radius Calculation

```
Blast radius = affected_users * impact_severity * duration
```

Start with smallest possible radius:
1. Single instance in staging
2. Single instance in production (dark traffic)
3. Canary (1-5% of traffic)
4. Broader rollout only after validation

## Abort Conditions

Define before starting. Halt immediately when:
- Error rate exceeds 2x the predicted tolerance
- Any data loss detected
- Customer-facing alerts fire
- Experiment duration exceeds planned window by 50%
- Dependent team raises concern

Abort is not failure - it's a safety mechanism. Always have a one-command rollback.

## Success and Failure Criteria

**Success**: All predictions held within tolerance. System behaved as hypothesized.
**Partial success**: System recovered but exceeded tolerance temporarily.
**Failure**: System did not maintain steady state. This is the most valuable outcome.

Document:
- Which predictions passed/failed
- Root cause of any failures
- Time to detection and time to recovery
- Whether monitoring/alerting caught the issue

## Rules

- No experiment without a written hypothesis
- Quantify every prediction (no "should be fine")
- Blast radius starts minimal and expands only with evidence
- Abort conditions are non-negotiable and pre-agreed
- Failure is a learning outcome, not a mistake
- Share results regardless of pass/fail
