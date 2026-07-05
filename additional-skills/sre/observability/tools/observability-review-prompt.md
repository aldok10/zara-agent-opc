# Observability Review Prompt

You are reviewing the telemetry and observability setup for a production service or platform. Evaluate the implementation against SRE best practices.

## Input Required

Provide the following for review:
- OTel Collector configuration (YAML)
- SLO definitions (Sloth/Pyrra YAML or Prometheus rules)
- Dashboard definitions (JSON/Jsonnet) or screenshots
- Alerting rules and routing configuration
- Service architecture diagram or description

## Review Checklist

### Collection Pipeline
- [ ] OTel Collector is the single ingestion point (no direct SDK-to-backend)
- [ ] memory_limiter is first processor in every pipeline
- [ ] k8sattributes enrichment enabled with relevant labels
- [ ] Tail sampling configured: 100% errors, 100% slow, low baseline rate
- [ ] Batch processor configured with appropriate size and timeout
- [ ] Queue and retry configured on all exporters
- [ ] Resource limits set on Collector pods
- [ ] Health check endpoint enabled for liveness probes

### Signal Coverage
- [ ] RED method: Rate, Errors, Duration for every service
- [ ] USE method: Utilization, Saturation, Errors for infrastructure
- [ ] Structured logs with trace_id, span_id, service.name, level
- [ ] W3C traceparent propagated across all service boundaries
- [ ] Exemplars enabled on latency histograms
- [ ] eBPF instrumentation covers uninstrumented services

### SLO and Alerting
- [ ] SLOs defined for all critical user-facing services
- [ ] Multi-window burn-rate alerts (not raw threshold alerts)
- [ ] At least two page-level windows (1h/fast burn + 6h/slow burn)
- [ ] Ticket-level alert for budget erosion over days
- [ ] Error budget policy documented (actions at thresholds)
- [ ] Alert routing correct: page -> PagerDuty, ticket -> Jira, info -> silent

### Dashboards and Correlation
- [ ] Dashboards stored as code (version controlled)
- [ ] Metrics-to-traces correlation (exemplars or Tempo integration)
- [ ] Traces-to-logs correlation (trace_id in log queries)
- [ ] Service map or topology view available
- [ ] SLO burn rate visible on service dashboard

### Cardinality and Cost
- [ ] No high-cardinality labels on metrics (user_id, request_id, trace_id)
- [ ] Active series budget defined per service (target: <50k)
- [ ] Metric retention tiers configured (raw/downsampled/long-term)
- [ ] Sampling rate appropriate for traffic volume
- [ ] Unused metrics identified and candidates for removal

## Output Format

For each section, provide:
1. Status: PASS / FAIL / PARTIAL
2. Findings: specific issues found
3. Recommendations: ordered by impact (highest first)
4. Risk: what breaks if not addressed

Conclude with:
- Overall readiness score (1-5)
- Top 3 actions to improve observability posture
- Estimated effort for each recommendation (hours/days)
