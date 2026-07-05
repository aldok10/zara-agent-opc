---
type: fact
title: "Flink Patterns"
---

# Flink Patterns

Apache Flink 2.x: unified batch/stream processing, windowing, state management, and checkpointing.

## Core Concepts

### DataStream API

```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.setParallelism(4);

DataStream<Event> events = env
    .fromSource(kafkaSource, WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(10)), "kafka")
    .filter(event -> event.getType().equals("purchase"))
    .keyBy(Event::getUserId)
    .window(TumblingEventTimeWindows.of(Time.minutes(5)))
    .aggregate(new PurchaseAggregator());
```

### Table API / Flink SQL (Preferred for Analytics)

```sql
CREATE TABLE orders (
    order_id STRING,
    customer_id STRING,
    amount DECIMAL(12, 2),
    event_time TIMESTAMP(3),
    WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'orders',
    'properties.bootstrap.servers' = 'broker:9092',
    'format' = 'avro-confluent',
    'avro-confluent.url' = 'http://schema-registry:8081'
);
```

## Windowing

### Window Types

| Window | Description | Use Case |
|--------|-------------|----------|
| Tumbling | Fixed-size, non-overlapping | Hourly aggregations |
| Sliding | Fixed-size, overlapping | Moving averages |
| Session | Gap-based, per key | User session analysis |
| Global | Single window per key | Custom triggers |

### Event Time vs Processing Time

Always prefer event time for correctness:

```sql
-- Event time: uses timestamp from the data
WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND

-- Processing time: uses wall clock (incorrect under replay/backfill)
-- Only use for non-critical monitoring
```

### Watermarks

Watermarks tell Flink "no events with timestamp <= watermark will arrive."

- `forBoundedOutOfOrderness(Duration.ofSeconds(10))`: tolerate 10s late data
- Events arriving after watermark -> dropped or sent to side output (late data)
- Set watermark based on observed max lateness (p99 of event delay)

### Allowed Lateness

```sql
SELECT
    TUMBLE_START(event_time, INTERVAL '1' HOUR) AS window_start,
    customer_id,
    SUM(amount) AS total
FROM orders
GROUP BY TUMBLE(event_time, INTERVAL '1' HOUR), customer_id;
```

In DataStream API:
```java
.window(TumblingEventTimeWindows.of(Time.hours(1)))
.allowedLateness(Time.minutes(5))
.sideOutputLateData(lateOutputTag)
```

## State Management

### State Backends

| Backend | Storage | Use Case |
|---------|---------|----------|
| HashMapStateBackend | JVM heap | Small state (<10GB), fast |
| EmbeddedRocksDBStateBackend | Disk (RocksDB) | Large state (TB+), incremental checkpoints |

```yaml
state.backend: rocksdb
state.backend.rocksdb.memory.managed: true
state.checkpoints.dir: s3://flink-checkpoints/prod/
state.savepoints.dir: s3://flink-savepoints/prod/
```

### Keyed State

```java
ValueState<Long> countState = getRuntimeContext().getState(
    new ValueStateDescriptor<>("count", Long.class));

ListState<Event> bufferState = getRuntimeContext().getListState(
    new ListStateDescriptor<>("buffer", Event.class));

MapState<String, Double> aggregateState = getRuntimeContext().getMapState(
    new MapStateDescriptor<>("aggregates", String.class, Double.class));
```

### State TTL

```java
StateTtlConfig ttl = StateTtlConfig.newBuilder(Duration.ofHours(24))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupInRocksdbCompactFilter(1000)
    .build();
```

## Checkpointing

```yaml
execution.checkpointing.interval: 30s
execution.checkpointing.mode: EXACTLY_ONCE
execution.checkpointing.min-pause: 10s
execution.checkpointing.timeout: 10min
execution.checkpointing.max-concurrent-checkpoints: 1
execution.checkpointing.unaligned.enabled: true
```

**Unaligned checkpoints** (Flink 1.11+): reduce checkpoint duration under backpressure by allowing in-flight data in checkpoint barriers.

### Checkpoint vs Savepoint

| | Checkpoint | Savepoint |
|-|-----------|-----------|
| Purpose | Automatic recovery | Manual: upgrade, migration |
| Trigger | Periodic (automatic) | On-demand (manual) |
| Format | Internal, optimized | Portable, canonical |
| Retention | Configurable | Kept until deleted |

## Exactly-Once Sinks

```java
KafkaSink<String> sink = KafkaSink.<String>builder()
    .setBootstrapServers("broker:9092")
    .setRecordSerializer(...)
    .setDeliveryGuarantee(DeliveryGuarantee.EXACTLY_ONCE)
    .setTransactionalIdPrefix("flink-tx")
    .build();
```

Requirements for exactly-once end-to-end:
- Checkpointing enabled
- Source supports replay (Kafka with offset reset)
- Sink supports transactions or is idempotent

## Performance Tuning

### Parallelism

```yaml
parallelism.default: 8
taskmanager.numberOfTaskSlots: 4
taskmanager.memory.process.size: 8g
taskmanager.memory.managed.fraction: 0.4
```

### Network Buffers

```yaml
taskmanager.network.memory.fraction: 0.1
taskmanager.network.memory.min: 64mb
taskmanager.network.memory.max: 1gb
```

### Backpressure

Monitor via Flink UI. High backpressure means:
- Downstream is slower than upstream
- Fix: increase parallelism on bottleneck operator, optimize processing logic, or add buffering

## Anti-Patterns

- Using processing time when event-time correctness matters
- Small checkpoint intervals (<10s) causing checkpoint overhead
- Large state without TTL (unbounded memory growth)
- Not handling late data (silently drops events)
- Synchronous I/O in processing functions (use AsyncFunction)
- Not using incremental checkpoints with RocksDB (full snapshot is slow for large state)
