# Steady State

## Defining Steady State

Steady state is the measurable "normal" behavior of your system. Select SLIs that reflect user experience:
- **Latency**: p50, p95, p99 response times
- **Error rate**: 5xx responses / total requests
- **Throughput**: requests per second, messages processed
- **Saturation**: CPU, memory, queue depth within thresholds

## Establishing Baselines

Measure over a representative window (7-14 days minimum):
```promql
# Baseline p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Baseline error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

Account for:
- Traffic patterns (weekday vs weekend, peak hours)
- Deployment windows (exclude rollout periods)
- Known anomalies (incidents, load tests)

## Automated Verification

Use Prometheus queries to validate steady state programmatically:
```python
def verify_steady_state():
    p95 = prometheus.query('histogram_quantile(0.95, rate(http_duration_bucket[5m]))')
    error_rate = prometheus.query('sum(rate(http_5xx[5m])) / sum(rate(http_total[5m]))')
    
    assert p95 < LATENCY_THRESHOLD, f"p95 {p95}ms exceeds {LATENCY_THRESHOLD}ms"
    assert error_rate < ERROR_THRESHOLD, f"error rate {error_rate} exceeds {ERROR_THRESHOLD}"
```

Run verification before, during, and after experiments.

## Recovery Detection

Steady state is restored when metrics return within baseline bounds:
- Define recovery window (e.g., 5 consecutive minutes within threshold)
- Use hysteresis to avoid false recovery (single good reading != recovered)
- Track time-to-recovery as experiment output

## SLO Connection

Experiments consume error budget:
- If SLO is 99.9% availability, experiment must not breach remaining budget
- Calculate maximum allowed impact before running
- Abort experiment if error budget would be exhausted
- Document budget impact in experiment report

## Monitoring During Experiments

Required observability:
- **Dashboard**: dedicated chaos experiment view (metrics + experiment timeline)
- **Alerts**: tighten thresholds during experiments (catch impact faster)
- **Logs**: correlate experiment events with application behavior
- **Traces**: identify which requests are affected

## Post-Experiment Comparison

Structure results as three phases:
| Phase | Duration | Key Metrics |
|-------|----------|-------------|
| Before | 5-10min baseline | Confirm steady state |
| During | Experiment active | Measure deviation |
| After | Recovery window | Time to restore |

Compare deviation magnitude and recovery time against hypotheses.
