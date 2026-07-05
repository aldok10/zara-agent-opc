-- BigQuery: Partitioned + Clustered Table Example

CREATE TABLE `project.analytics.order_events` (
    event_id STRING NOT NULL,
    order_id STRING NOT NULL,
    customer_id STRING NOT NULL,
    event_type STRING NOT NULL,
    channel STRING,
    amount NUMERIC(12, 2),
    currency STRING,
    metadata JSON,
    event_timestamp TIMESTAMP NOT NULL,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY customer_id, event_type, channel
OPTIONS (
    description = 'Order lifecycle events',
    partition_expiration_days = 730,
    require_partition_filter = true,
    labels = [('team', 'data-platform'), ('env', 'production')]
);

CREATE MATERIALIZED VIEW `project.analytics.daily_order_summary`
PARTITION BY event_date
CLUSTER BY customer_id
OPTIONS (
    enable_refresh = true,
    refresh_interval_minutes = 30,
    max_staleness = INTERVAL '1' HOUR
)
AS
SELECT
    DATE(event_timestamp) AS event_date,
    customer_id,
    event_type,
    channel,
    COUNT(*) AS event_count,
    SUM(amount) AS total_amount,
    COUNT(DISTINCT order_id) AS unique_orders
FROM `project.analytics.order_events`
GROUP BY 1, 2, 3, 4;

CREATE TABLE `project.analytics.daily_customer_metrics` (
    metric_date DATE NOT NULL,
    customer_id STRING NOT NULL,
    orders_placed INT64,
    orders_completed INT64,
    orders_cancelled INT64,
    total_revenue NUMERIC(14, 2),
    avg_order_value NUMERIC(12, 2),
    first_order_date DATE,
    last_order_date DATE,
    lifetime_orders INT64,
    lifetime_revenue NUMERIC(14, 2)
)
PARTITION BY metric_date
CLUSTER BY customer_id
OPTIONS (
    partition_expiration_days = 1095,
    require_partition_filter = true
);

MERGE INTO `project.analytics.daily_customer_metrics` AS target
USING (
    SELECT
        DATE(event_timestamp) AS metric_date,
        customer_id,
        COUNTIF(event_type = 'placed') AS orders_placed,
        COUNTIF(event_type = 'completed') AS orders_completed,
        COUNTIF(event_type = 'cancelled') AS orders_cancelled,
        SUM(IF(event_type = 'completed', amount, 0)) AS total_revenue,
        SAFE_DIVIDE(
            SUM(IF(event_type = 'completed', amount, 0)),
            COUNTIF(event_type = 'completed')
        ) AS avg_order_value
    FROM `project.analytics.order_events`
    WHERE DATE(event_timestamp) = @run_date
    GROUP BY 1, 2
) AS source
ON target.metric_date = source.metric_date
   AND target.customer_id = source.customer_id
WHEN MATCHED THEN UPDATE SET
    orders_placed = source.orders_placed,
    orders_completed = source.orders_completed,
    orders_cancelled = source.orders_cancelled,
    total_revenue = source.total_revenue,
    avg_order_value = source.avg_order_value
WHEN NOT MATCHED THEN INSERT (
    metric_date, customer_id, orders_placed, orders_completed,
    orders_cancelled, total_revenue, avg_order_value
) VALUES (
    source.metric_date, source.customer_id, source.orders_placed,
    source.orders_completed, source.orders_cancelled,
    source.total_revenue, source.avg_order_value
);
