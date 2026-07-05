# Model Monitoring

## Why Monitor

Models degrade silently. Unlike software bugs that crash, model failures manifest as slowly worsening predictions that nobody notices until business metrics tank.

## What to Monitor

### Prediction Quality

- Accuracy/F1/AUC over time (requires delayed ground truth)
- Prediction confidence distribution
- Error rate by segment (geographic, demographic, temporal)
- Business metric correlation (conversion, revenue, engagement)

### Data Drift

Input feature distributions shifting from training data.

**Detection methods**:
- KS test (Kolmogorov-Smirnov) -- univariate continuous features
- Chi-squared test -- categorical features
- PSI (Population Stability Index) -- bucketed distribution comparison
- MMD (Maximum Mean Discrepancy) -- multivariate, kernel-based
- Embedding drift -- cosine distance in representation space

**Thresholds**:
- PSI < 0.1: no significant drift
- PSI 0.1-0.25: moderate drift, investigate
- PSI > 0.25: significant drift, retrain

### Concept Drift

The relationship between inputs and outputs changes.

**Detection methods**:
- Performance degradation on recent labeled data
- ADWIN (Adaptive Windowing) -- streaming detection
- Page-Hinkley test -- sequential change detection
- Model confidence calibration shift

### Operational Metrics

- Latency (p50, p95, p99)
- Throughput (predictions/second)
- Error rate (5xx, timeouts)
- GPU utilization and memory
- Queue depth and processing lag

## Alerting Strategy

### Severity Levels

| Level | Trigger | Action | Response Time |
|-------|---------|--------|---------------|
| P1 | Model endpoint down | Page on-call | 5 min |
| P1 | Error rate > 5% | Page on-call | 5 min |
| P2 | Significant drift detected | Alert channel | 4 hours |
| P2 | Latency p99 > 2x baseline | Alert channel | 4 hours |
| P3 | Moderate drift detected | Daily digest | Next business day |
| P3 | Prediction distribution shift | Daily digest | Next business day |

### Alert Design

- Compare against rolling baseline (not static threshold)
- Use anomaly detection on metrics for adaptive thresholds
- Suppress during known events (deployments, holidays)
- Include context: which features drifted, sample predictions

## Monitoring Stack (2026)

| Tool | Focus |
|------|-------|
| Evidently AI | Drift detection, data quality, ML reports |
| Whylogs/WhyLabs | Lightweight profiling, streaming support |
| Arize | Full observability platform, LLM monitoring |
| Fiddler | Explainability + monitoring |
| Prometheus + Grafana | Operational metrics |
| Custom + Great Expectations | Data validation gates |

## Drift Response Playbook

1. **Alert fires**: drift detected on feature X
2. **Triage**: is it real drift or data pipeline issue?
3. **Impact assessment**: check prediction quality metrics
4. **Root cause**: upstream data change? Seasonal? Market shift?
5. **Decide**: retrain, rollback, or accept and monitor?
6. **Act**: trigger retraining pipeline or manual intervention
7. **Validate**: confirm new model resolves drift impact

## LLM-Specific Monitoring (2026)

- Response quality scoring (LLM-as-judge)
- Hallucination detection (claim verification against sources)
- Toxicity and safety filter rates
- Token usage and cost per request
- Retrieval quality (for RAG): relevance, recall
- Latency: time-to-first-token and tokens-per-second
