import duckdb
from pathlib import Path


def create_connection(db_path: str | None = None) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(db_path or ":memory:")
    con.sql("SET memory_limit = '4GB'")
    con.sql("SET threads TO 4")
    return con


def profile_dataset(con: duckdb.DuckDBPyConnection, parquet_path: str) -> None:
    print("=== Dataset Profile ===")
    con.sql(f"SUMMARIZE SELECT * FROM '{parquet_path}'").show()

    row_count = con.sql(f"SELECT COUNT(*) AS n FROM '{parquet_path}'").fetchone()[0]
    print(f"\nTotal rows: {row_count:,}")


def top_customers_by_revenue(
    con: duckdb.DuckDBPyConnection, parquet_path: str, top_n: int = 20
) -> duckdb.DuckDBPyRelation:
    return con.sql(f"""
        SELECT
            customer_id,
            COUNT(DISTINCT order_id) AS orders,
            SUM(amount) AS total_revenue,
            AVG(amount) AS avg_order_value,
            MIN(order_date) AS first_order,
            MAX(order_date) AS last_order,
            DATEDIFF('day', MIN(order_date), MAX(order_date)) AS customer_lifespan_days
        FROM '{parquet_path}'
        WHERE status IN ('completed', 'shipped')
        GROUP BY customer_id
        ORDER BY total_revenue DESC
        LIMIT {top_n}
    """)


def monthly_cohort_retention(
    con: duckdb.DuckDBPyConnection, parquet_path: str
) -> duckdb.DuckDBPyRelation:
    return con.sql(f"""
        WITH first_purchase AS (
            SELECT
                customer_id,
                DATE_TRUNC('month', MIN(order_date)) AS cohort_month
            FROM '{parquet_path}'
            WHERE status = 'completed'
            GROUP BY customer_id
        ),
        monthly_activity AS (
            SELECT
                customer_id,
                DATE_TRUNC('month', order_date) AS activity_month
            FROM '{parquet_path}'
            WHERE status = 'completed'
            GROUP BY customer_id, DATE_TRUNC('month', order_date)
        )
        SELECT
            fp.cohort_month,
            DATEDIFF('month', fp.cohort_month, ma.activity_month) AS months_since_first,
            COUNT(DISTINCT ma.customer_id) AS active_customers,
            COUNT(DISTINCT ma.customer_id)::FLOAT /
                FIRST(COUNT(DISTINCT ma.customer_id)) OVER (
                    PARTITION BY fp.cohort_month ORDER BY ma.activity_month
                ) AS retention_rate
        FROM first_purchase fp
        JOIN monthly_activity ma ON fp.customer_id = ma.customer_id
        GROUP BY fp.cohort_month, ma.activity_month
        ORDER BY fp.cohort_month, months_since_first
    """)


def product_performance(
    con: duckdb.DuckDBPyConnection,
    orders_path: str,
    products_path: str,
) -> duckdb.DuckDBPyRelation:
    return con.sql(f"""
        SELECT
            p.category,
            p.product_name,
            COUNT(*) AS units_sold,
            SUM(o.amount) AS revenue,
            SUM(o.amount) / SUM(SUM(o.amount)) OVER (PARTITION BY p.category) AS pct_of_category,
            RANK() OVER (PARTITION BY p.category ORDER BY SUM(o.amount) DESC) AS rank_in_category
        FROM '{orders_path}' o
        JOIN '{products_path}' p ON o.product_id = p.product_id
        WHERE o.status = 'completed'
        GROUP BY p.category, p.product_name
        QUALIFY rank_in_category <= 10
        ORDER BY p.category, rank_in_category
    """)


def export_results(con: duckdb.DuckDBPyConnection, parquet_path: str, output_dir: str) -> None:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    top_customers = top_customers_by_revenue(con, parquet_path)
    con.sql(f"""
        COPY ({top_customers.sql_query()})
        TO '{output / "top_customers.parquet"}'
        (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    retention = monthly_cohort_retention(con, parquet_path)
    con.sql(f"""
        COPY ({retention.sql_query()})
        TO '{output / "cohort_retention.parquet"}'
        (FORMAT PARQUET, COMPRESSION ZSTD)
    """)


if __name__ == "__main__":
    con = create_connection()
    parquet_path = "data/orders/*.parquet"

    profile_dataset(con, parquet_path)

    print("\n=== Top Customers ===")
    top_customers_by_revenue(con, parquet_path).show()

    print("\n=== Cohort Retention ===")
    monthly_cohort_retention(con, parquet_path).show()

    export_results(con, parquet_path, "data/analysis_output")
    print("\nResults exported to data/analysis_output/")
