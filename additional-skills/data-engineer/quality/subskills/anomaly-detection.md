# Data Anomaly Detection

Statistical methods, ML-based detection, alerting strategies, and baseline management.

## When to Load

- Building automated anomaly detection for data pipelines
- Detecting unexpected changes in data volume, distribution, or freshness
- Reducing false positives from static threshold alerts
- Implementing self-adjusting baselines for seasonal data

## Key Concepts

**Detection Methods**
- Statistical: Z-score, IQR, moving averages (simple, interpretable)
- Time-series: seasonal decomposition, Prophet, ARIMA (captures patterns)
- ML-based: Isolation Forest, autoencoders (complex patterns, less interpretable)
- Rule-based: domain-specific thresholds (most reliable for known failure modes)

**What to Monitor**
- Volume: row counts per table/partition (most basic, most valuable)
- Freshness: time since last update (SLA-critical)
- Distribution: value distributions shift (schema-encoded as histograms)
- Nullness: null rate changes indicate source issues
- Cardinality: distinct value counts (new categories, lost dimensions)
- Schema: column additions, removals, type changes

**Baseline Strategies**
- Trailing window: last N days as reference (adapts to gradual change)
- Same period last year: handles annual seasonality
- Day-of-week aligned: weekday vs weekend patterns
- Hybrid: weighted combination of recent + seasonal baselines
- Warm-up period: collect baseline before enabling alerts (2-4 weeks)

## Patterns

```python
import numpy as np
from datetime import datetime, timedelta

class VolumeAnomalyDetector:
    def __init__(self, lookback_days: int = 30, z_threshold: float = 3.0):
        self.lookback_days = lookback_days
        self.z_threshold = z_threshold

    def check(self, current_count: int, historical_counts: list[int]) -> dict:
        if len(historical_counts) < 7:
            return {"status": "insufficient_baseline", "alert": False}

        mean = np.mean(historical_counts)
        std = np.std(historical_counts)

        if std == 0:
            is_anomaly = current_count != mean
            z_score = float("inf") if is_anomaly else 0.0
        else:
            z_score = abs(current_count - mean) / std
            is_anomaly = z_score > self.z_threshold

        return {
            "status": "anomaly" if is_anomaly else "normal",
            "alert": is_anomaly,
            "current": current_count,
            "expected_range": (
                mean - self.z_threshold * std,
                mean + self.z_threshold * std,
            ),
            "z_score": round(z_score, 2),
        }


class FreshnessMonitor:
    def __init__(self, sla_minutes: int, warning_pct: float = 0.8):
        self.sla_minutes = sla_minutes
        self.warning_minutes = sla_minutes * warning_pct

    def check(self, last_update: datetime) -> dict:
        age_minutes = (datetime.utcnow() - last_update).total_seconds() / 60
        if age_minutes > self.sla_minutes:
            return {"status": "breach", "alert": True, "age_minutes": age_minutes}
        elif age_minutes > self.warning_minutes:
            return {"status": "warning", "alert": False, "age_minutes": age_minutes}
        return {"status": "healthy", "alert": False, "age_minutes": age_minutes}
```

**Alert Design**
```yaml
# Anomaly alerting configuration
monitors:
  - table: fct_orders
    checks:
      - type: volume
        method: z_score
        threshold: 3.0
        lookback_days: 30
        ignore_days: [saturday, sunday]  # weekend patterns
        severity: high

      - type: freshness
        sla_minutes: 120
        severity: critical

      - type: null_rate
        columns: [customer_id, order_amount]
        max_null_pct: 0.01
        severity: medium

      - type: distribution
        column: order_amount
        method: ks_test
        p_value_threshold: 0.001
        severity: medium
```

## Gotchas

- Z-score assumes normal distribution -- skewed data needs different methods
- Seasonal patterns (Black Friday, month-end) cause false positives without calendar awareness
- One-time events (migrations, backfills) need manual suppression
- Too many alerts = alert fatigue = missed real issues
- ML models need retraining as data patterns evolve
- Anomaly != problem -- always include context for on-call to investigate

## Verification

- Inject known anomalies (2x volume, 50% nulls) -- confirm detection fires
- Confirm no alerts during normal operations over 1-week period
- False positive rate tracked and below 5%
- Alert includes actionable context (which table, what metric, expected vs actual)
- Suppression rules work for planned events (maintenance windows)
