from airflow.decorators import dag, task
from airflow.datasets import Dataset
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from datetime import datetime, timedelta
import json


orders_dataset = Dataset("bigquery://project.warehouse.orders")
metrics_dataset = Dataset("bigquery://project.warehouse.daily_metrics")


default_args = {
    "owner": "data-platform",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=2),
}


@dag(
    schedule="@hourly",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args=default_args,
    tags=["ingestion", "orders"],
    doc_md="Ingest order events from source API into BigQuery staging.",
)
def ingest_orders():

    @task
    def extract_from_api(ds: str, data_interval_start=None, data_interval_end=None) -> str:
        import requests

        response = requests.get(
            "https://api.internal.com/orders",
            params={
                "start": data_interval_start.isoformat(),
                "end": data_interval_end.isoformat(),
            },
            timeout=120,
        )
        response.raise_for_status()
        orders = response.json()["orders"]

        output_path = f"gs://data-lake/raw/orders/{ds}/{data_interval_start.hour:02d}.json"
        upload_to_gcs(orders, output_path)

        return json.dumps({
            "path": output_path,
            "record_count": len(orders),
            "interval": f"{data_interval_start} -> {data_interval_end}",
        })

    @task
    def validate_extract(extract_metadata: str) -> str:
        meta = json.loads(extract_metadata)
        if meta["record_count"] == 0:
            raise ValueError(f"No records extracted for interval {meta['interval']}")
        return meta["path"]

    @task(outlets=[orders_dataset])
    def load_to_staging(gcs_path: str, ds: str) -> None:
        from google.cloud import bigquery

        client = bigquery.Client()
        job_config = bigquery.LoadJobConfig(
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
            schema_update_options=[bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION],
        )
        client.load_table_from_uri(
            gcs_path,
            "project.staging.raw_orders",
            job_config=job_config,
        ).result()

    raw = extract_from_api()
    validated = validate_extract(raw)
    load_to_staging(validated)


@dag(
    schedule=[orders_dataset],
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args=default_args,
    tags=["transform", "analytics"],
    doc_md="Transform raw orders into daily metrics mart.",
)
def transform_order_metrics():

    @task
    def get_processing_dates() -> list[str]:
        from airflow.models import Variable
        last_processed = Variable.get("last_metrics_date", default_var="2024-01-01")
        today = datetime.now().strftime("%Y-%m-%d")
        return generate_date_range(last_processed, today)

    deduplicate = BigQueryInsertJobOperator(
        task_id="deduplicate_orders",
        configuration={
            "query": {
                "query": """
                    CREATE OR REPLACE TABLE `project.staging.orders_deduped` AS
                    SELECT * EXCEPT(row_num) FROM (
                        SELECT *,
                            ROW_NUMBER() OVER (
                                PARTITION BY order_id ORDER BY ingested_at DESC
                            ) AS row_num
                        FROM `project.staging.raw_orders`
                        WHERE DATE(order_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
                    ) WHERE row_num = 1
                """,
                "useLegacySql": False,
            }
        },
    )

    build_metrics = BigQueryInsertJobOperator(
        task_id="build_daily_metrics",
        configuration={
            "query": {
                "query": """
                    MERGE INTO `project.warehouse.daily_metrics` AS target
                    USING (
                        SELECT
                            DATE(order_timestamp) AS order_date,
                            customer_segment,
                            COUNT(DISTINCT order_id) AS total_orders,
                            SUM(amount) AS total_revenue,
                            AVG(amount) AS avg_order_value,
                            COUNT(DISTINCT customer_id) AS unique_customers
                        FROM `project.staging.orders_deduped`
                        GROUP BY 1, 2
                    ) AS source
                    ON target.order_date = source.order_date
                       AND target.customer_segment = source.customer_segment
                    WHEN MATCHED THEN UPDATE SET
                        total_orders = source.total_orders,
                        total_revenue = source.total_revenue,
                        avg_order_value = source.avg_order_value,
                        unique_customers = source.unique_customers
                    WHEN NOT MATCHED THEN INSERT VALUES (
                        source.order_date, source.customer_segment,
                        source.total_orders, source.total_revenue,
                        source.avg_order_value, source.unique_customers
                    )
                """,
                "useLegacySql": False,
            }
        },
        outlets=[metrics_dataset],
    )

    @task
    def validate_metrics() -> None:
        from google.cloud import bigquery
        client = bigquery.Client()
        result = client.query("""
            SELECT COUNT(*) AS cnt
            FROM `project.warehouse.daily_metrics`
            WHERE order_date = CURRENT_DATE() - 1
        """).result()
        row = list(result)[0]
        if row.cnt == 0:
            raise ValueError("No metrics generated for yesterday")

    deduplicate >> build_metrics >> validate_metrics()


def upload_to_gcs(data, path):
    raise NotImplementedError("Replace with actual GCS upload")


def generate_date_range(start, end):
    raise NotImplementedError("Replace with actual date range generation")


ingest_orders()
transform_order_metrics()
