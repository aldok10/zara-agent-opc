-- Flink SQL: Windowed Aggregation Examples

-- Source table from Kafka with event-time watermark
CREATE TABLE order_events (
    order_id STRING,
    customer_id STRING,
    amount DECIMAL(12, 2),
    currency STRING,
    category STRING,
    event_type STRING,
    event_time TIMESTAMP(3),
    processing_time AS PROCTIME(),
    WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'properties.bootstrap.servers' = 'broker:9092',
    'properties.group.id' = 'flink-analytics',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'avro-confluent',
    'avro-confluent.url' = 'http://schema-registry:8081'
);

-- Sink table for aggregated results
CREATE TABLE hourly_metrics (
    window_start TIMESTAMP(3),
    window_end TIMESTAMP(3),
    category STRING,
    order_count BIGINT,
    total_revenue DECIMAL(14, 2),
    avg_order_value DECIMAL(12, 2),
    unique_customers BIGINT,
    PRIMARY KEY (window_start, category) NOT ENFORCED
) WITH (
    'connector' = 'upsert-kafka',
    'topic' = 'hourly-order-metrics',
    'properties.bootstrap.servers' = 'broker:9092',
    'key.format' = 'json',
    'value.format' = 'json'
);

-- Tumbling window: hourly aggregation
INSERT INTO hourly_metrics
SELECT
    TUMBLE_START(event_time, INTERVAL '1' HOUR) AS window_start,
    TUMBLE_END(event_time, INTERVAL '1' HOUR) AS window_end,
    category,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_order_value,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM order_events
WHERE event_type = 'completed'
GROUP BY TUMBLE(event_time, INTERVAL '1' HOUR), category;

-- Sliding window: 5-minute window every 1 minute (real-time monitoring)
CREATE TEMPORARY VIEW rolling_5min AS
SELECT
    HOP_START(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTES) AS window_start,
    HOP_END(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTES) AS window_end,
    COUNT(*) AS order_count,
    SUM(amount) AS total_revenue,
    COUNT(DISTINCT customer_id) AS unique_customers
FROM order_events
WHERE event_type = 'completed'
GROUP BY HOP(event_time, INTERVAL '1' MINUTE, INTERVAL '5' MINUTES);

-- Cumulative window: running daily total
CREATE TEMPORARY VIEW daily_cumulative AS
SELECT
    event_time,
    category,
    SUM(amount) OVER (
        PARTITION BY category
        ORDER BY event_time
        RANGE BETWEEN INTERVAL '1' DAY PRECEDING AND CURRENT ROW
    ) AS rolling_24h_revenue
FROM order_events
WHERE event_type = 'completed';

-- Session window: group events with gaps < 30 minutes
CREATE TEMPORARY VIEW user_sessions AS
SELECT
    SESSION_START(event_time, INTERVAL '30' MINUTE) AS session_start,
    SESSION_END(event_time, INTERVAL '30' MINUTE) AS session_end,
    customer_id,
    COUNT(*) AS events_in_session,
    SUM(amount) AS session_revenue,
    TIMESTAMPDIFF(MINUTE,
        SESSION_START(event_time, INTERVAL '30' MINUTE),
        SESSION_END(event_time, INTERVAL '30' MINUTE)
    ) AS session_duration_minutes
FROM order_events
GROUP BY SESSION(event_time, INTERVAL '30' MINUTE), customer_id;

-- Top-N per window (most active customers per hour)
CREATE TEMPORARY VIEW top_customers_hourly AS
SELECT *
FROM (
    SELECT
        window_start,
        customer_id,
        order_count,
        total_spent,
        ROW_NUMBER() OVER (PARTITION BY window_start ORDER BY total_spent DESC) AS rn
    FROM (
        SELECT
            TUMBLE_START(event_time, INTERVAL '1' HOUR) AS window_start,
            customer_id,
            COUNT(*) AS order_count,
            SUM(amount) AS total_spent
        FROM order_events
        WHERE event_type = 'completed'
        GROUP BY TUMBLE(event_time, INTERVAL '1' HOUR), customer_id
    )
)
WHERE rn <= 10;

-- Late data handling with allowed lateness
-- (Flink SQL handles this via watermark; data arriving after watermark is dropped)
-- For explicit late data routing, use DataStream API with side outputs
