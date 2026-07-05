import polars as pl
from pathlib import Path


def load_raw_orders(path: str) -> pl.LazyFrame:
    return pl.scan_parquet(path).select(
        "order_id",
        "customer_id",
        "product_id",
        "quantity",
        "unit_price",
        "discount_pct",
        "order_timestamp",
        "status",
    )


def load_customers(path: str) -> pl.LazyFrame:
    return pl.scan_parquet(path).select(
        "customer_id",
        "segment",
        "region",
        "signup_date",
    )


def clean_orders(orders: pl.LazyFrame) -> pl.LazyFrame:
    return orders.filter(
        pl.col("status").is_in(["completed", "shipped"]),
        pl.col("quantity") > 0,
        pl.col("unit_price") > 0,
    ).with_columns(
        (pl.col("quantity") * pl.col("unit_price")).alias("gross_amount"),
        (
            pl.col("quantity")
            * pl.col("unit_price")
            * (1 - pl.col("discount_pct") / 100)
        ).alias("net_amount"),
        pl.col("order_timestamp").dt.date().alias("order_date"),
        pl.col("order_timestamp").dt.truncate("1mo").alias("order_month"),
    )


def enrich_with_customers(
    orders: pl.LazyFrame, customers: pl.LazyFrame
) -> pl.LazyFrame:
    return orders.join(customers, on="customer_id", how="left")


def compute_daily_metrics(enriched: pl.LazyFrame) -> pl.LazyFrame:
    return enriched.group_by("order_date", "segment", "region").agg(
        pl.col("order_id").n_unique().alias("unique_orders"),
        pl.col("net_amount").sum().alias("total_revenue"),
        pl.col("net_amount").mean().alias("avg_order_value"),
        pl.col("customer_id").n_unique().alias("unique_customers"),
        pl.col("quantity").sum().alias("total_units"),
    )


def compute_customer_cohorts(enriched: pl.LazyFrame) -> pl.LazyFrame:
    return (
        enriched.with_columns(
            pl.col("signup_date").dt.truncate("1mo").alias("cohort_month"),
        )
        .group_by("cohort_month", "order_month")
        .agg(
            pl.col("customer_id").n_unique().alias("active_customers"),
            pl.col("net_amount").sum().alias("cohort_revenue"),
        )
        .sort("cohort_month", "order_month")
    )


def compute_rfm(enriched: pl.LazyFrame, reference_date: str) -> pl.LazyFrame:
    ref = pl.lit(reference_date).str.to_date("%Y-%m-%d")
    return (
        enriched.group_by("customer_id")
        .agg(
            (ref - pl.col("order_date").max()).dt.total_days().alias("recency_days"),
            pl.col("order_id").n_unique().alias("frequency"),
            pl.col("net_amount").sum().alias("monetary"),
        )
        .with_columns(
            pl.col("recency_days")
            .qcut(5, labels=["5", "4", "3", "2", "1"])
            .alias("r_score"),
            pl.col("frequency")
            .qcut(5, labels=["1", "2", "3", "4", "5"])
            .alias("f_score"),
            pl.col("monetary")
            .qcut(5, labels=["1", "2", "3", "4", "5"])
            .alias("m_score"),
        )
    )


def run_pipeline(
    orders_path: str,
    customers_path: str,
    output_dir: str,
    reference_date: str = "2026-07-01",
) -> None:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    raw_orders = load_raw_orders(orders_path)
    customers = load_customers(customers_path)

    cleaned = clean_orders(raw_orders)
    enriched = enrich_with_customers(cleaned, customers)

    daily = compute_daily_metrics(enriched).collect()
    daily.write_parquet(output / "daily_metrics.parquet")

    cohorts = compute_customer_cohorts(enriched).collect()
    cohorts.write_parquet(output / "customer_cohorts.parquet")

    rfm = compute_rfm(enriched, reference_date).collect()
    rfm.write_parquet(output / "rfm_scores.parquet")


if __name__ == "__main__":
    run_pipeline(
        orders_path="data/raw/orders/*.parquet",
        customers_path="data/raw/customers.parquet",
        output_dir="data/processed",
    )
