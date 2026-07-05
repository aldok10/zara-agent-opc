---
type: tool
title: "SLA Validation Test Design Prompt"
---

# SLA Validation Test Design Prompt

## Purpose
Design performance tests that validate specific SLA thresholds including response time percentiles, throughput, and error rate budgets.

## When to Use
- Defining performance acceptance criteria for a new service
- Creating load test scripts that enforce SLA boundaries
- Validating SLAs after infrastructure changes
- Building performance gates in CI/CD pipelines

## Prompt Template

```
You are a performance engineer designing SLA validation tests.

CONTEXT:
- Service: {service_name}
- SLA document: {link_or_paste_sla_terms}
- Load tool: {k6|gatling|locust|jmeter|artillery}
- Environment: {perf_env_specs_or_prod_shadow}
- Traffic pattern: {steady|ramp|spike|diurnal}
- Baseline data: {current_p50_p95_p99_if_known}

SLA TARGETS:
- Response time P50: {ms}
- Response time P95: {ms}
- Response time P99: {ms}
- Throughput: {requests_per_second}
- Error rate: {percentage}
- Availability: {percentage}

DESIGN THE VALIDATION SUITE:

1. TEST SCENARIOS
   - Steady state: sustained load at expected traffic
   - Peak: 2-3x normal load for defined duration
   - Spike: sudden burst to N% above peak
   - Soak: steady load for extended duration (detect leaks)
   - Each scenario: load profile, duration, ramp-up/down

2. THRESHOLD CONFIGURATION
   - Map each SLA metric to tool-specific threshold
   - Define pass/fail criteria per scenario
   - Include warm-up exclusion period
   - Separate thresholds for critical vs non-critical endpoints

3. WORKLOAD MODEL
   - User journeys with realistic think times
   - Request distribution matching production ratios
   - Data variation (don't hit same cache keys)
   - Authentication token handling
   - Dependent service behavior (mocked or real)

4. MEASUREMENT PLAN
   - Client-side metrics (what the tool reports)
   - Server-side metrics (actual processing time)
   - Infrastructure metrics (CPU, memory, connections)
   - Correlation between load level and latency degradation

5. CI GATE CONFIGURATION
   - Which scenarios run on every PR
   - Which run nightly/weekly
   - Threshold sensitivity (strict for regression, relaxed for PR)
   - Alert routing on failure

RULES:
- Percentiles, not averages  -  averages hide tail latency
- Test against production-like data volumes
- Account for warm-up (JIT, connection pool, cache fill)
- Include error responses in latency calculations
- Document what "pass" means precisely (all thresholds met for full duration)
```

## Output Format

```markdown
## SLA Validation Suite

### Scenarios
| Scenario | VUs | Duration | Ramp | Threshold |
|----------|-----|----------|------|-----------|

### Thresholds
| Metric | Target | Scenario | Auto-fail |
|--------|--------|----------|-----------|

### Load Script
[k6/gatling/locust script with thresholds embedded]

### CI Integration
[Pipeline config with performance gate]

### Interpretation Guide
- PASS: all thresholds met
- WARN: P50/P95 pass, P99 within 10% of limit
- FAIL: any threshold breached
```
