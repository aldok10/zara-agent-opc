# Performance Test Reporting

## Grafana Dashboard Setup

### k6 + Prometheus (recommended)

Run k6 with Prometheus remote-write output:
```bash
K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \
  k6 run --out experimental-prometheus-rw script.js
```

### k6 + InfluxDB

```bash
k6 run --out influxdb=http://influxdb:8086/k6 script.js
```

### Essential Dashboard Panels

1. **Request Rate** (queries/sec): `rate(k6_http_reqs_total[1m])`
2. **Response Time Percentiles**: `histogram_quantile(0.95, rate(k6_http_req_duration_seconds_bucket[1m]))`
3. **Error Rate**: `rate(k6_http_req_failed_total[1m]) / rate(k6_http_reqs_total[1m])`
4. **VU Count**: `k6_vus` gauge
5. **Iteration Rate**: `rate(k6_iterations_total[1m])`
6. **Data Transfer**: `rate(k6_data_received_total[1m])`

## Key Visualizations

**Percentile Heatmaps**: Show response time distribution over time. Reveals bimodal distributions that averages hide. Use Grafana's heatmap panel with `k6_http_req_duration_seconds_bucket`.

**Throughput Over Time**: Overlay RPS with response time on dual-axis chart. The point where latency inflects while RPS plateaus marks the saturation point.

**Error Rate by Type**: Stack chart of HTTP status codes (4xx vs 5xx) and timeout errors. Distinguishes client errors from server failures.

**Apdex Score**: `(satisfied + tolerating*0.5) / total`. Satisfied < T, tolerating < 4T. Single number for stakeholder reporting.

## Trend Comparison

**Baseline Method**:
1. Run identical test configuration on known-good build (tag as `baseline`)
2. Run on current build (tag as `current`)
3. Compare p50, p95, p99 deltas

**Regression Detection Rules**:
- p95 latency increase > 20% from baseline = warning
- p99 latency increase > 50% from baseline = failure
- Error rate increase > 0.5% = failure
- Throughput decrease > 10% at same load = warning

Store historical results in time-series DB. Alert on trend: 3 consecutive degradations = escalate.

## CI Reporting

### JSON Summary Output

```bash
k6 run --summary-export=results.json script.js
```

Output includes all metrics with percentiles, thresholds pass/fail status, and check results.

### Threshold-Based Pass/Fail

k6 exits with code 99 when thresholds fail. CI pipeline integration:

```yaml
# GitHub Actions example
- name: Run performance test
  run: k6 run --out json=results.json script.js
  continue-on-error: true
- name: Check results
  run: |
    if [ $? -eq 99 ]; then
      echo "Performance thresholds breached"
      exit 1
    fi
```

### JUnit Format (via xk6-junit or post-processing)

Convert k6 JSON output to JUnit XML for test reporting tools:
```bash
k6 run --summary-export=results.json script.js
node k6-to-junit.js results.json > results.xml
```

## Stakeholder Reporting Template

```markdown
# Performance Test Report - [Date] - [Build/Version]

## Summary
- Test Type: [load/stress/soak/spike]
- Duration: [X minutes]
- Peak Load: [N RPS / N VUs]
- Result: PASS / FAIL

## Key Metrics
| Metric | Target (SLO) | Actual | Status |
|--------|-------------|--------|--------|
| p95 latency | < 200ms | 180ms | PASS |
| p99 latency | < 500ms | 420ms | PASS |
| Error rate | < 1% | 0.3% | PASS |
| Throughput | > 1000 RPS | 1250 RPS | PASS |

## Findings
- [Notable observation or risk]

## Recommendations
- [Action items if any]

## Comparison to Previous
- p95 improved 12% from last release
- Throughput capacity increased after DB index optimization
```

## Historical Tracking and Capacity Planning

**Store per-run metadata**: git SHA, timestamp, environment, test parameters, key metrics.

**Capacity extrapolation**:
1. Plot throughput ceiling from multiple step-up tests over time
2. Overlay with production traffic growth trend
3. Identify when projected traffic will hit measured capacity
4. Plan scaling actions (vertical, horizontal, optimization) with lead time

**Automated capacity alerts**: When production peak reaches 60% of last measured capacity ceiling, trigger performance test re-validation and capacity review.

**Cost efficiency tracking**: Track cost-per-request metric (infra cost / total requests) over time. Performance optimizations should reduce this ratio.
