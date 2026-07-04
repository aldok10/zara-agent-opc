# Performance Testing

Verify the system meets latency, throughput, and stability requirements under load -- and detect regressions before users do.

## Types

- **Load testing**: expected/peak traffic. Validates the system handles normal demand.
- **Stress testing**: push beyond capacity. Finds the breaking point and how the system fails (graceful vs cliff).
- **Soak testing**: sustained load over hours/days. Reveals memory leaks, connection exhaustion, slow degradation.
- **Spike testing**: sudden burst of traffic. Validates autoscaling and back-pressure behavior.

## Budget-Based

Define explicit budgets and treat violations as build failures, not just dashboards:

- Latency: `p99 < 200ms`.
- Throughput: `>= 1000 rps`.
- Error rate: `< 0.1%`.

A p99 regression is a broken build, not a monitoring note (constraint 11).

## Tools

- **k6** -- scriptable (JS), developer-friendly, CI-native. Recommended default.
- **Locust** (Python).
- **Gatling** (Scala).
- **Artillery** (Node).

## Where in the Pipeline

- **Synthetic benchmarks in CI**: small, fast, deterministic -- detect regressions per-commit against a baseline.
- **Load tests in staging**: realistic infra, validate capacity before release.
- **Soak tests scheduled**: nightly/weekly, catch memory leaks and slow resource exhaustion.

## Key Metrics

- **Latency percentiles**: p50, p95, p99 -- averages hide pain, always watch the tail.
- **Throughput**: requests/sec sustained.
- **Error rate** under load.
- **Resource utilization**: CPU, memory, connections, GC pauses under load.

## Anti-Patterns

- **Testing against localhost**: no real network, no realistic infra -- meaningless numbers.
- **No baseline**: without a recorded baseline you can't detect a regression, only absolute failure.
- **Testing once**: performance rots continuously; test continuously.
- **Ignoring tail latency**: averaging away p99 hides the experience of your slowest, often most important, requests.
- **Unrealistic data volume**: testing with 100 rows when prod has 100M.
