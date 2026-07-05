import dagster as dg
import pandas as pd
from datetime import datetime


daily_partition = dg.DailyPartitionsDefinition(start_date="2024-01-01")


class WarehouseResource(dg.ConfigurableResource):
    connection_string: str

    def execute_query(self, sql: str) -> pd.DataFrame:
        import sqlalchemy
        engine = sqlalchemy.create_engine(self.connection_string)
        return pd.read_sql(sql, engine)

    def write_table(self, df: pd.DataFrame, table: str, if_exists: str = "replace") -> None:
        import sqlalchemy
        engine = sqlalchemy.create_engine(self.connection_string)
        df.to_sql(table, engine, if_exists=if_exists, index=False)


class S3Resource(dg.ConfigurableResource):
    bucket: str
    prefix: str = "data"

    def read_parquet(self, key: str) -> pd.DataFrame:
        return pd.read_parquet(f"s3://{self.bucket}/{self.prefix}/{key}")

    def write_parquet(self, df: pd.DataFrame, key: str) -> None:
        df.to_parquet(f"s3://{self.bucket}/{self.prefix}/{key}", index=False)


@dg.asset(
    partitions_def=daily_partition,
    group_name="raw",
    description="Raw order events ingested from source API",
    kinds={"python", "s3"},
)
def raw_orders(
    context: dg.AssetExecutionContext,
    s3: S3Resource,
) -> None:
    partition_date = context.partition_key
    context.log.info(f"Fetching orders for {partition_date}")

    df = fetch_orders_from_api(date=partition_date)
    s3.write_parquet(df, f"raw/orders/{partition_date}.parquet")

    context.add_output_metadata({
        "row_count": len(df),
        "partition_date": partition_date,
        "columns": list(df.columns),
    })


@dg.asset(
    partitions_def=daily_partition,
    group_name="staging",
    description="Cleaned and validated orders",
    kinds={"python", "s3"},
)
def cleaned_orders(
    context: dg.AssetExecutionContext,
    raw_orders: None,
    s3: S3Resource,
) -> None:
    partition_date = context.partition_key
    df = s3.read_parquet(f"raw/orders/{partition_date}.parquet")

    cleaned = (
        df.dropna(subset=["order_id", "customer_id", "amount"])
        .drop_duplicates(subset=["order_id"])
        .assign(
            amount=lambda x: x["amount"].clip(lower=0),
            order_date=lambda x: pd.to_datetime(x["order_timestamp"]).dt.date,
        )
    )

    s3.write_parquet(cleaned, f"staging/orders/{partition_date}.parquet")

    context.add_output_metadata({
        "input_rows": len(df),
        "output_rows": len(cleaned),
        "drop_rate": f"{(1 - len(cleaned)/len(df))*100:.1f}%",
    })


@dg.asset(
    partitions_def=daily_partition,
    group_name="marts",
    description="Daily order metrics aggregated by customer segment",
    freshness_policy=dg.FreshnessPolicy(maximum_lag_minutes=120),
    kinds={"python", "warehouse"},
)
def daily_order_metrics(
    context: dg.AssetExecutionContext,
    cleaned_orders: None,
    s3: S3Resource,
    warehouse: WarehouseResource,
) -> None:
    partition_date = context.partition_key
    df = s3.read_parquet(f"staging/orders/{partition_date}.parquet")

    metrics = df.groupby(["order_date", "customer_segment"]).agg(
        total_orders=("order_id", "nunique"),
        total_revenue=("amount", "sum"),
        avg_order_value=("amount", "mean"),
        unique_customers=("customer_id", "nunique"),
    ).reset_index()

    warehouse.write_table(metrics, f"marts.daily_order_metrics_{partition_date}")

    context.add_output_metadata({
        "row_count": len(metrics),
        "total_revenue": float(metrics["total_revenue"].sum()),
        "segments": list(metrics["customer_segment"].unique()),
    })


@dg.schedule(
    cron_schedule="0 6 * * *",
    target=dg.AssetSelection.groups("raw", "staging", "marts"),
    default_status=dg.DefaultScheduleStatus.RUNNING,
)
def daily_pipeline_schedule(context: dg.ScheduleEvaluationContext):
    yesterday = (context.scheduled_execution_time - pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    return dg.RunRequest(
        partition_key=yesterday,
        tags={"triggered_by": "schedule", "date": yesterday},
    )


@dg.sensor(
    target=dg.AssetSelection.keys("raw_orders"),
    minimum_interval_seconds=300,
)
def new_orders_sensor(context: dg.SensorEvaluationContext, s3: S3Resource):
    last_cursor = context.cursor or "2024-01-01"
    new_dates = check_for_new_source_data(since=last_cursor)

    for date in new_dates:
        yield dg.RunRequest(
            run_key=f"orders_{date}",
            partition_key=date,
        )

    if new_dates:
        context.update_cursor(max(new_dates))


def fetch_orders_from_api(date: str) -> pd.DataFrame:
    raise NotImplementedError("Replace with actual API call")


def check_for_new_source_data(since: str) -> list[str]:
    raise NotImplementedError("Replace with actual check")


defs = dg.Definitions(
    assets=[raw_orders, cleaned_orders, daily_order_metrics],
    schedules=[daily_pipeline_schedule],
    sensors=[new_orders_sensor],
    resources={
        "s3": S3Resource(bucket="my-data-lake"),
        "warehouse": WarehouseResource(connection_string="postgresql://..."),
    },
)
