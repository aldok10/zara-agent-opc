# ML Monitoring

Data drift, concept drift, performance degradation detection, and alerting for production ML systems.

## When to Load

- Setting up monitoring for deployed ML models
- Detecting when model performance degrades
- Distinguishing data drift from concept drift
- Building alerting and retraining triggers

## Key Concepts

**Data Drift** -- Input data distribution changes over time. Feature values shift from training distribution. Causes: upstream schema changes, seasonality, user behavior shifts. Detect with statistical tests (KS, PSI, chi-squared).

**Concept Drift** -- Relationship between inputs and outputs changes. The "right answer" for the same input changes over time. Harder to detect without ground truth labels. Types: sudden, gradual, recurring, incremental.

**Performance Degradation** -- Model accuracy/precision/recall drops. Can be caused by either data drift or concept drift. Monitor with delayed ground truth labels when available.

**Feature Monitoring** -- Track per-feature statistics: mean, stddev, min/max, null rate, cardinality. Alert when values exceed training-time bounds. Catch upstream data quality issues early.

**Retraining Triggers** -- Automated: drift score exceeds threshold, performance below SLA for N days. Manual: domain expert flags issues. Scheduled: weekly/monthly regardless of drift.

## Patterns

```python
# Population Stability Index (PSI) for drift detection
import numpy as np

def calculate_psi(expected, actual, bins=10):
    breakpoints = np.quantile(expected, np.linspace(0, 1, bins + 1))
    expected_percents = np.histogram(expected, breakpoints)[0] / len(expected)
    actual_percents = np.histogram(actual, breakpoints)[0] / len(actual)

    expected_percents = np.clip(expected_percents, 0.001, None)
    actual_percents = np.clip(actual_percents, 0.001, None)

    psi = np.sum((actual_percents - expected_percents) *
                 np.log(actual_percents / expected_percents))
    return psi

# PSI interpretation:
# < 0.1: no significant drift
# 0.1 - 0.2: moderate drift, investigate
# > 0.2: significant drift, likely retraining needed
```

```python
# Monitoring pipeline (scheduled job)
from datetime import datetime, timedelta

def monitor_model(model_name: str, window_hours: int = 24):
    reference = load_training_distribution(model_name)
    current = load_recent_predictions(model_name, hours=window_hours)

    alerts = []

    # Feature drift
    for feature in reference.features:
        psi = calculate_psi(reference[feature], current[feature])
        if psi > 0.2:
            alerts.append({"type": "data_drift", "feature": feature, "psi": psi})

    # Prediction distribution shift
    pred_psi = calculate_psi(reference.predictions, current.predictions)
    if pred_psi > 0.15:
        alerts.append({"type": "prediction_drift", "psi": pred_psi})

    # Performance (if labels available)
    if current.has_labels:
        accuracy = calculate_accuracy(current.predictions, current.labels)
        if accuracy < reference.baseline_accuracy * 0.95:
            alerts.append({"type": "performance_degradation", "accuracy": accuracy})

    # Feature quality
    for feature in reference.features:
        null_rate = current[feature].isnull().mean()
        if null_rate > reference.null_thresholds[feature] * 2:
            alerts.append({"type": "data_quality", "feature": feature, "null_rate": null_rate})

    return alerts
```

```yaml
# Alert configuration
monitoring:
  model: text-classifier-v2
  schedule: "*/30 * * * *"  # every 30 minutes
  alerts:
    data_drift:
      threshold_psi: 0.2
      features: [text_length, word_count, language_score]
      action: notify
    performance:
      metric: f1_macro
      threshold: 0.85
      window: 7d
      action: trigger_retraining
    latency:
      p99_ms: 200
      action: page_oncall
```

## Gotchas

- Monitoring predictions without ground truth labels gives incomplete picture -- use proxy metrics
- PSI on high-cardinality features (text, embeddings) requires dimension reduction first
- Seasonal drift (holiday traffic) should not trigger unnecessary retraining -- use seasonal baselines
- Alert fatigue: too many low-severity drift alerts get ignored -- tune thresholds carefully
- Retraining on drifted data without understanding WHY it drifted can encode bad patterns

## Verification

- Drift detection runs on a schedule and alerts fire within expected latency
- Alert thresholds are calibrated: low false positive rate (<5%), catches real issues (test with synthetic drift)
- Retraining pipeline can be triggered automatically and produces a model within SLA
- Dashboard shows current drift scores, performance metrics, and prediction distributions
- Post-incident reviews trace model failures back to drift events (retrospective validation)
