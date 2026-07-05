# Airflow Best Practices

DAG design patterns, TaskFlow API, XCom, and operational patterns for Apache Airflow 2.8+.

## TaskFlow API (Preferred)

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(
    schedule="@daily",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["analytics"],
    default_args={"retries": 2, "retry_delay": 300},
)
def daily_analytics_pipeline():

    @task
    def extract(ds: str) -> dict:
        data = fetch_from_api(date=ds)
        return {"records": len(data), "path": f"s3://raw/{ds}/data.parquet"}

    @task
    def transform(extract_result: dict) -> str:
        df = load_from_s3(extract_result["path"])
        cleaned = clean_data(df)
        output_path = f"s3://staging/{extract_result['path'].split('/')[-2]}/cleaned.parquet"
        save_to_s3(cleaned, output_path)
        return output_path

    @task
    def load(staging_path: str) -> None:
        load_to_warehouse(staging_path)

    raw = extract()
    staged = transform(raw)
    load(staged)

daily_analytics_pipeline()
```

## DAG Design Patterns

### Separation of Concerns

```
extract_dag (scheduled) -> staging_dag (triggered) -> mart_dag (triggered)
```

Use `TriggerDagRunOperator` or dataset-driven scheduling for DAG chaining.

### Dataset-Driven Scheduling (Airflow 2.4+)

```python
from airflow.datasets import Dataset

orders_dataset = Dataset("s3://warehouse/orders/")

@dag(schedule=[orders_dataset])
def downstream_analytics():
    ...

@dag(schedule="@hourly")
def ingest_orders():
    @task(outlets=[orders_dataset])
    def load_orders():
        ...
```

### Dynamic Task Mapping

```python
@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def process_regions():

    @task
    def get_regions() -> list[str]:
        return ["us-east", "us-west", "eu-central", "apac"]

    @task
    def process_region(region: str, ds: str) -> dict:
        return {"region": region, "rows_processed": ingest_region(region, ds)}

    @task
    def summarize(results: list[dict]) -> None:
        total = sum(r["rows_processed"] for r in results)
        log.info(f"Processed {total} total rows across {len(results)} regions")

    regions = get_regions()
    results = process_region.expand(region=regions)
    summarize(results)
```

## XCom Best Practices

- Keep XCom payloads small (<48KB for metadata DB storage)
- For large data, store in S3/GCS and pass the URI via XCom
- Use custom XCom backends for large payloads (S3XComBackend)
- TaskFlow auto-serializes return values to XCom -- be mindful of size
- Never pass DataFrames through XCom; pass file paths

## Operators

### Common Operators

| Operator | Use Case |
|----------|----------|
| `@task` (TaskFlow) | Python logic |
| `BashOperator` | Shell commands |
| `BigQueryInsertJobOperator` | BQ SQL queries |
| `S3ToRedshiftOperator` | S3 -> Redshift COPY |
| `DbtCloudRunJobOperator` | Trigger dbt Cloud |
| `KubernetesPodOperator` | Isolated execution |
| `TriggerDagRunOperator` | Cross-DAG triggering |

### KubernetesPodOperator for Isolation

```python
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator

transform_heavy = KubernetesPodOperator(
    task_id="heavy_transform",
    name="heavy-transform",
    image="data-pipeline:latest",
    cmds=["python", "transform.py"],
    arguments=["--date={{ ds }}"],
    resources={"request_memory": "4Gi", "request_cpu": "2"},
    is_delete_operator_pod=True,
)
```

## Configuration

### Variables and Connections

```python
from airflow.models import Variable

warehouse_config = Variable.get("warehouse_config", deserialize_json=True)
```

- Store secrets in Airflow Connections (not Variables)
- Use Secrets Backend (AWS SSM, GCP Secret Manager, Vault) for production
- Never hardcode credentials in DAG files

### DAG-Level Configuration

```python
default_args = {
    "owner": "data-platform",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=2),
    "on_failure_callback": alert_on_failure,
    "sla": timedelta(hours=4),
}
```

## Operational Patterns

### Idempotency

- All tasks must produce the same result on re-run
- Use MERGE/upsert, not INSERT for warehouse loads
- Use `{{ ds }}` (execution date) for date-based processing, not `datetime.now()`
- DELETE then INSERT or full partition overwrite for reprocessing

### Backfill

```bash
airflow dags backfill daily_analytics_pipeline \
    --start-date 2026-01-01 \
    --end-date 2026-01-31 \
    --reset-dagruns
```

### SLA and Alerting

```python
@dag(sla_miss_callback=notify_sla_miss)
def critical_pipeline():
    @task(sla=timedelta(hours=1))
    def time_critical_task():
        ...
```

## Anti-Patterns

- Top-level Python code in DAG files (slows scheduler parsing)
- Using `catchup=True` without idempotent tasks
- Storing large data in XCom (use object storage + URI)
- Single monolithic DAG with 100+ tasks (split by domain)
- Using SubDAGs (deprecated -- use TaskGroups instead)
- Relying on task execution order without explicit dependencies
- Running heavy computation in the Airflow worker (use K8s/external)
