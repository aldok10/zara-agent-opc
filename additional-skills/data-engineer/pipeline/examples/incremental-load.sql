-- Incremental Load: MERGE Pattern
-- Idempotent incremental load using MERGE (upsert) with partition pruning.

-- Target table (warehouse)
CREATE TABLE IF NOT EXISTS warehouse.order_metrics (
    order_date DATE NOT NULL,
    customer_segment VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    total_orders INT,
    total_revenue DECIMAL(14, 2),
    avg_order_value DECIMAL(12, 2),
    unique_customers INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_date, customer_segment, region)
)
PARTITION BY RANGE (order_date);

-- Incremental merge: processes only new/changed data
-- Safe to re-run (idempotent via MERGE + deterministic aggregation)
MERGE INTO warehouse.order_metrics AS target
USING (
    SELECT
        order_date,
        customer_segment,
        region,
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(net_amount) AS total_revenue,
        AVG(net_amount) AS avg_order_value,
        COUNT(DISTINCT customer_id) AS unique_customers
    FROM staging.orders_cleaned
    WHERE order_date >= :watermark_date
      AND order_date < :run_date
    GROUP BY order_date, customer_segment, region
) AS source
ON target.order_date = source.order_date
   AND target.customer_segment = source.customer_segment
   AND target.region = source.region
WHEN MATCHED THEN UPDATE SET
    total_orders = source.total_orders,
    total_revenue = source.total_revenue,
    avg_order_value = source.avg_order_value,
    unique_customers = source.unique_customers,
    updated_at = CURRENT_TIMESTAMP
WHEN NOT MATCHED THEN INSERT (
    order_date, customer_segment, region,
    total_orders, total_revenue, avg_order_value,
    unique_customers, updated_at
) VALUES (
    source.order_date, source.customer_segment, source.region,
    source.total_orders, source.total_revenue, source.avg_order_value,
    source.unique_customers, CURRENT_TIMESTAMP
);

-- BigQuery variant (uses DML MERGE)
MERGE INTO `project.warehouse.order_metrics` AS target
USING (
    SELECT
        DATE(order_timestamp) AS order_date,
        customer_segment,
        region,
        COUNT(DISTINCT order_id) AS total_orders,
        SUM(net_amount) AS total_revenue,
        AVG(net_amount) AS avg_order_value,
        COUNT(DISTINCT customer_id) AS unique_customers
    FROM `project.staging.orders_cleaned`
    WHERE DATE(order_timestamp) >= DATE_SUB(@run_date, INTERVAL 3 DAY)
      AND DATE(order_timestamp) < @run_date
    GROUP BY 1, 2, 3
) AS source
ON target.order_date = source.order_date
   AND target.customer_segment = source.customer_segment
   AND target.region = source.region
WHEN MATCHED THEN UPDATE SET
    total_orders = source.total_orders,
    total_revenue = source.total_revenue,
    avg_order_value = source.avg_order_value,
    unique_customers = source.unique_customers,
    updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT ROW;

-- Watermark update (run after successful MERGE)
UPDATE pipeline_state
SET high_watermark = :run_date::TEXT,
    rows_processed = (
        SELECT COUNT(*) FROM staging.orders_cleaned
        WHERE order_date >= :watermark_date AND order_date < :run_date
    ),
    last_run_at = CURRENT_TIMESTAMP,
    last_run_status = 'success'
WHERE pipeline_id = 'order_metrics_incremental';
