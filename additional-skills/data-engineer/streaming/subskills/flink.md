# Apache Flink

Windowing, state management, checkpointing, and Flink SQL for stream processing.

## When to Load

- Building stateful stream processing applications
- Implementing windowed aggregations with event-time semantics
- Configuring checkpointing for exactly-once guarantees
- Using Flink SQL for streaming analytics

## Key Concepts

**Processing Model**
- Event time: when the event actually occurred (from data)
- Processing time: when the event is processed by Flink (wall clock)
- Ingestion time: when the event enters Flink (compromise)
- Watermarks: mechanism to track event-time progress and handle late data

**Window Types**
- Tumbling: fixed-size, non-overlapping (e.g., every 5 minutes)
- Sliding: fixed-size, overlapping (e.g., 10-min window every 1 minute)
- Session: dynamic size, gap-based (e.g., close after 30min inactivity)
- Global: single window per key, requires custom trigger

**State Management**
- Keyed state: partitioned by key (ValueState, ListState, MapState)
- Operator state: shared across all records in an operator instance
- State backends: HashMapStateBackend (fast, memory), EmbeddedRocksDBStateBackend (large state)
- State TTL: automatic expiration of stale state entries

**Checkpointing**
- Periodic snapshot of operator state to durable storage
- Exactly-once: barriers align across all operators (Chandy-Lamport)
- At-least-once: barriers don't wait for alignment (lower latency)
- Savepoints: manual checkpoints for upgrades and scaling

## Patterns

```java
// Windowed aggregation with event-time and late data handling
DataStream<Event> events = env
    .fromSource(kafkaSource, WatermarkStrategy
        .<Event>forBoundedOutOfOrderness(Duration.ofSeconds(10))
        .withTimestampAssigner((event, ts) -> event.getTimestamp()),
        "Kafka Source");

SingleOutputStreamOperator<AggResult> result = events
    .keyBy(Event::getUserId)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .allowedLateness(Time.minutes(1))
    .sideOutputLateData(lateOutputTag)
    .aggregate(new CountAggregator(), new WindowResultFunction());

result.sinkTo(sinkFunction);
result.getSideOutput(lateOutputTag).sinkTo(lateSinkFunction);
```

```sql
-- Flink SQL: tumbling window aggregation
CREATE TABLE orders (
    order_id STRING,
    user_id STRING,
    amount DECIMAL(10,2),
    order_time TIMESTAMP(3),
    WATERMARK FOR order_time AS order_time - INTERVAL '10' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'format' = 'json'
);

SELECT
    user_id,
    TUMBLE_START(order_time, INTERVAL '5' MINUTE) AS window_start,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount
FROM orders
GROUP BY
    user_id,
    TUMBLE(order_time, INTERVAL '5' MINUTE);
```

**Checkpoint Configuration**
```java
env.enableCheckpointing(60000); // every 60 seconds
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
env.getCheckpointConfig().setCheckpointTimeout(120000);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().setExternalizedCheckpointCleanup(
    ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION);
```

## Gotchas

- Watermarks only advance when events arrive -- idle partitions stall watermarks
- Large state + frequent checkpoints = high I/O pressure on storage
- RocksDB state backend: tune block cache, write buffer for large-state jobs
- Savepoints are not backward compatible across major version upgrades
- Exactly-once sinks require transactional sink connectors (Kafka, JDBC with 2PC)
- Back-pressure propagates upstream -- one slow operator slows entire pipeline

## Verification

- Checkpoint duration is stable and within timeout threshold
- No checkpoint failures in monitoring (Flink dashboard or metrics)
- Late data percentage is within expected bounds
- After restart from checkpoint: no duplicate or missing output
- Back-pressure metrics show healthy pipeline (no persistent back-pressure)
