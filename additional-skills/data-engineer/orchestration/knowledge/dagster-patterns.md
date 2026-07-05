---
type: fact
title: "Dagster Patterns"
---

# Dagster Patterns

Software-defined assets, resources, schedules, and sensors for modern data orchestration.

## Core Model: Assets Over Tasks

Dagster models pipelines as **assets** (data artifacts) not tasks (operations). An asset is a persistent object in storage -- a table, file, ML model, or report.

```python
import dagster as dg

@dg.asset(
    description="Daily aggregated order metrics",
    group_name="analytics",
    kinds={"sql", "bigquery"},
)
def daily_order_metrics(context: dg.AssetExecutionContext, orders: dg.AssetIn) -> None:
    ...
```

### Why Assets

- Lineage is automatic (inputs define dependencies)
- Freshness tracking built-in
- Selective materialization (rebuild one table, not entire DAG)
- Partitioning is first-class
- Observable state in the UI

## Asset Definitions

### Basic Asset

```python
@dg.asset
def raw_orders(context: dg.AssetExecutionContext) -> pd.DataFrame:
    return pd.read_parquet("s3://bucket/raw/orders/")
```

### Asset with Dependencies

```python
@dg.asset(deps=[raw_orders])
def cleaned_orders(context: dg.AssetExecutionContext) -> pd.DataFrame:
    df = context.resources.io_manager.load_input("raw_orders")
    return df.dropna(subset=["order_id", "amount"])
```

### Asset with Upstream Input

```python
@dg.asset
def order_metrics(cleaned_orders: pd.DataFrame) -> pd.DataFrame:
    return cleaned_orders.groupby("date").agg(
        total_orders=("order_id", "nunique"),
        total_revenue=("amount", "sum"),
    )
```

## Partitioned Assets

```python
daily_partition = dg.DailyPartitionsDefinition(start_date="2024-01-01")

@dg.asset(partitions_def=daily_partition)
def daily_events(context: dg.AssetExecutionContext) -> pd.DataFrame:
    partition_date = context.partition_key
    return fetch_events_for_date(partition_date)

@dg.asset(partitions_def=daily_partition)
def daily_aggregates(context: dg.AssetExecutionContext, daily_events: pd.DataFrame) -> pd.DataFrame:
    return daily_events.groupby("event_type").agg(count=("id", "count"))
```

### Multi-Partitions

```python
multi_partition = dg.MultiPartitionsDefinition({
    "date": dg.DailyPartitionsDefinition(start_date="2024-01-01"),
    "region": dg.StaticPartitionsDefinition(["us", "eu", "apac"]),
})
```

## Resources

Shared infrastructure clients, configured per environment.

```python
class BigQueryResource(dg.ConfigurableResource):
    project: str
    dataset: str
    credentials_path: str = "/secrets/bq-key.json"

    def query(self, sql: str) -> pd.DataFrame:
        from google.cloud import bigquery
        client = bigquery.Client(project=self.project)
        return client.query(sql).to_dataframe()


defs = dg.Definitions(
    assets=[daily_order_metrics, order_metrics],
    resources={
        "bigquery": BigQueryResource(
            project="my-project",
            dataset="analytics",
        ),
    },
)
```

## Schedules

```python
@dg.schedule(
    cron_schedule="0 6 * * *",
    target=dg.AssetSelection.groups("analytics"),
    default_status=dg.DefaultScheduleStatus.RUNNING,
)
def daily_analytics_schedule(context: dg.ScheduleEvaluationContext):
    return dg.RunRequest(
        partition_key=context.scheduled_execution_time.strftime("%Y-%m-%d"),
        tags={"triggered_by": "schedule"},
    )
```

## Sensors

React to external events (new files, database changes, webhooks).

```python
@dg.sensor(
    target=dg.AssetSelection.keys("raw_orders"),
    minimum_interval_seconds=60,
)
def new_file_sensor(context: dg.SensorEvaluationContext):
    new_files = check_s3_for_new_files("s3://bucket/incoming/")
    if new_files:
        yield dg.RunRequest(
            run_key=new_files[-1].key,
            tags={"source_file": new_files[-1].key},
        )
        context.update_cursor(new_files[-1].last_modified.isoformat())
```

## I/O Managers

Control how assets are stored and loaded.

```python
class ParquetIOManager(dg.IOManager):
    def __init__(self, base_path: str):
        self.base_path = base_path

    def handle_output(self, context: dg.OutputContext, obj: pd.DataFrame):
        path = f"{self.base_path}/{context.asset_key.path[-1]}.parquet"
        obj.to_parquet(path)

    def load_input(self, context: dg.InputContext) -> pd.DataFrame:
        path = f"{self.base_path}/{context.asset_key.path[-1]}.parquet"
        return pd.read_parquet(path)
```

## Freshness Policies

```python
@dg.asset(
    freshness_policy=dg.FreshnessPolicy(maximum_lag_minutes=60),
)
def critical_metrics() -> pd.DataFrame:
    ...
```

## Project Structure

```
my_dagster_project/
  __init__.py
  assets/
    __init__.py
    raw.py
    staging.py
    marts.py
  resources/
    __init__.py
    bigquery.py
    storage.py
  schedules.py
  sensors.py
  definitions.py
```

## Testing

```python
def test_daily_order_metrics():
    result = dg.materialize(
        [raw_orders, daily_order_metrics],
        resources={"bigquery": mock_bigquery},
        partition_key="2026-01-15",
    )
    assert result.success
    output = result.output_for_node("daily_order_metrics")
    assert len(output) > 0
```

## Anti-Patterns

- Defining ops/graphs when assets model the problem better
- Giant monolithic assets that do too much (split into stages)
- Not using partitions for time-series data
- Hardcoding credentials instead of using resources
- Ignoring freshness policies for critical downstream consumers
