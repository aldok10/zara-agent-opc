---
type: subskill
title: "Feature Stores"
---

# Feature Stores

Online/offline serving, data freshness, point-in-time correctness, and feature engineering infrastructure.

## When to Load

- Building or choosing a feature store
- Ensuring training/serving consistency
- Solving point-in-time correctness for historical features
- Designing feature pipelines for real-time ML systems

## Key Concepts

**Online Store** -- Low-latency key-value lookup for real-time inference. Backed by Redis, DynamoDB, or specialized stores. Serves the latest feature values. Latency target: <10ms p99.

**Offline Store** -- Columnar storage for training data and batch scoring. Backed by data warehouse (BigQuery, Snowflake) or object storage (Parquet on S3). Stores full history.

**Point-in-Time Correctness** -- When building training data, features must reflect what was known AT THAT TIME, not current values. Prevents data leakage. Requires temporal joins with event timestamps.

**Feature Freshness** -- How recent is the feature value? Real-time features (seconds), near-real-time (minutes), batch (hours/daily). Match freshness to model sensitivity -- not every feature needs real-time.

**Training-Serving Skew** -- Differences between features computed for training vs serving. Common causes: different code paths, different data sources, timing differences. Feature stores solve this by using ONE definition for both.

## Patterns

```python
# Feast feature store definition
from feast import Entity, FeatureView, Field, FileSource
from feast.types import Float32, Int64, String
from datetime import timedelta

user = Entity(name="user_id", join_keys=["user_id"])

user_features = FeatureView(
    name="user_profile",
    entities=[user],
    schema=[
        Field(name="total_orders", dtype=Int64),
        Field(name="avg_order_value", dtype=Float32),
        Field(name="days_since_last_order", dtype=Int64),
        Field(name="preferred_category", dtype=String),
    ],
    source=FileSource(path="data/user_features.parquet", timestamp_field="event_timestamp"),
    ttl=timedelta(hours=24),
    online=True,
)

# Point-in-time retrieval for training
training_data = store.get_historical_features(
    entity_df=events_df,  # has user_id + event_timestamp
    features=[
        "user_profile:total_orders",
        "user_profile:avg_order_value",
        "user_profile:days_since_last_order",
    ],
).to_df()

# Online serving (real-time inference)
features = store.get_online_features(
    features=["user_profile:total_orders", "user_profile:avg_order_value"],
    entity_rows=[{"user_id": "user_123"}],
).to_dict()
```

```yaml
# Feature pipeline architecture
pipelines:
  batch_features:
    schedule: "0 2 * * *"  # daily at 2am
    source: data_warehouse
    compute: Spark/dbt
    sink: offline_store + online_store (materialization)
    features: [lifetime_value, purchase_frequency, churn_risk_score]

  streaming_features:
    source: Kafka (user events)
    compute: Flink/Spark Streaming
    sink: online_store (direct write)
    freshness: <5 minutes
    features: [session_duration, pages_viewed_last_5min, cart_value]

  on_demand_features:
    compute: at inference time
    source: request payload
    features: [text_length, hour_of_day, is_weekend]
```

```python
# Point-in-time join (preventing data leakage)
# WRONG: join on user_id only (uses future data)
# training = events.merge(features, on="user_id")

# CORRECT: join with temporal constraint
# For each event, get features as of event_timestamp
def point_in_time_join(events_df, feature_df):
    result = events_df.merge(feature_df, on="user_id", suffixes=("", "_feat"))
    result = result[result["event_timestamp"] >= result["feature_timestamp"]]
    result = result.sort_values("feature_timestamp").groupby(
        ["user_id", "event_timestamp"]
    ).last()
    return result
```

## Gotchas

- Online store without TTL serves stale features indefinitely for inactive users
- Point-in-time joins on large datasets are expensive -- pre-compute and snapshot
- Feature definitions in code that differ between training (Python) and serving (Java) cause skew
- Streaming features with exactly-once semantics are hard -- design for idempotency
- Feature stores add operational complexity -- for <10 features and one model, a simple pipeline suffices

## Verification

- Same feature definition produces identical values in training and serving (test with known inputs)
- Point-in-time retrieval never includes future data (test with synthetic timeline)
- Online store latency meets SLA under production load (<10ms p99)
- Feature freshness matches requirements (monitoring lag between source event and online store update)
- Feature store is not a single point of failure (graceful degradation if unavailable)
