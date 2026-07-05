"""
PySpark ETL job with best practices.
Demonstrates: config-driven pipeline, partitioning, data quality, idempotent writes.
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, to_date, year, month, dayofmonth,
    count, sum as spark_sum, avg, when, lit, current_timestamp
)
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType


INPUT_PATH = "s3://data-lake/raw/transactions/"
OUTPUT_PATH = "s3://data-lake/curated/daily_transactions/"
OUTPUT_FORMAT = "iceberg"
OUTPUT_TABLE = "catalog.curated.daily_transactions"


EXPECTED_SCHEMA = StructType([
    StructField("transaction_id", StringType(), False),
    StructField("user_id", StringType(), False),
    StructField("amount", DoubleType(), False),
    StructField("currency", StringType(), False),
    StructField("status", StringType(), False),
    StructField("created_at", TimestampType(), False),
])


def create_spark_session(app_name: str) -> SparkSession:
    return (
        SparkSession.builder
        .appName(app_name)
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.sql.adaptive.coalescePartitions.enabled", "true")
        .config("spark.sql.adaptive.skewJoin.enabled", "true")
        .config("spark.sql.shuffle.partitions", "200")
        .config("spark.sql.iceberg.handle-timestamp-without-timezone", "true")
        .getOrCreate()
    )


def validate_schema(df, expected_schema: StructType) -> bool:
    actual_fields = {f.name: f.dataType for f in df.schema.fields}
    for field in expected_schema.fields:
        if field.name not in actual_fields:
            raise ValueError(f"Missing required column: {field.name}")
        if actual_fields[field.name] != field.dataType:
            raise ValueError(
                f"Type mismatch for {field.name}: "
                f"expected {field.dataType}, got {actual_fields[field.name]}"
            )
    return True


def validate_data_quality(df, stage: str):
    total = df.count()
    if total == 0:
        raise ValueError(f"Empty DataFrame at stage: {stage}")

    null_counts = df.select([
        count(when(col(c).isNull(), c)).alias(c)
        for c in ["transaction_id", "user_id", "amount"]
    ]).collect()[0]

    for field in ["transaction_id", "user_id", "amount"]:
        null_count = null_counts[field]
        if null_count > 0:
            raise ValueError(
                f"Null values in required field '{field}': {null_count}/{total}"
            )

    negative_amounts = df.filter(col("amount") < 0).count()
    if negative_amounts > total * 0.01:
        raise ValueError(
            f"Too many negative amounts: {negative_amounts}/{total} (> 1% threshold)"
        )

    return total


def transform(df):
    df = df.filter(col("status").isin("completed", "refunded", "pending"))

    df = (
        df
        .withColumn("transaction_date", to_date("created_at"))
        .withColumn("year", year("created_at"))
        .withColumn("month", month("created_at"))
        .withColumn("day", dayofmonth("created_at"))
        .withColumn("amount_usd", when(
            col("currency") == "USD", col("amount")
        ).otherwise(col("amount") * lit(1.0)))
        .withColumn("processed_at", current_timestamp())
    )

    return df.select(
        "transaction_id", "user_id", "amount", "amount_usd",
        "currency", "status", "transaction_date",
        "year", "month", "day", "processed_at"
    )


def write_output(df, mode: str = "overwrite"):
    (
        df
        .sortWithinPartitions("transaction_date", "user_id")
        .writeTo(OUTPUT_TABLE)
        .tableProperty("write.target-file-size-bytes", "536870912")
        .partitionedBy("year", "month")
        .option("write-format", "parquet")
        .createOrReplace()
    )


def run_etl(processing_date: str):
    spark = create_spark_session("daily-transactions-etl")

    try:
        raw_df = (
            spark.read
            .parquet(INPUT_PATH)
            .filter(to_date("created_at") == processing_date)
        )

        validate_schema(raw_df, EXPECTED_SCHEMA)
        input_count = validate_data_quality(raw_df, "raw_input")

        transformed_df = transform(raw_df)
        output_count = validate_data_quality(transformed_df, "transformed")

        drop_rate = 1 - (output_count / input_count)
        if drop_rate > 0.10:
            raise ValueError(
                f"Excessive data loss: {drop_rate:.1%} dropped (> 10% threshold)"
            )

        write_output(transformed_df)

        print(f"ETL complete for {processing_date}: "
              f"{input_count} input -> {output_count} output "
              f"({drop_rate:.2%} filtered)")

    finally:
        spark.stop()


if __name__ == "__main__":
    import sys
    date = sys.argv[1] if len(sys.argv) > 1 else "2026-07-05"
    run_etl(date)
