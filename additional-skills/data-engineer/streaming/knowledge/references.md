# References

## Apache Kafka (10 refs)
- **Kafka Documentation** -- https://kafka.apache.org/documentation/ -- Official Apache Kafka reference
- **Confluent Developer** -- https://developer.confluent.io/ -- Tutorials and patterns for Kafka development
- **Kafka Streams** -- https://kafka.apache.org/documentation/streams/ -- Client library for stream processing
- **Schema Registry** -- https://docs.confluent.io/platform/current/schema-registry/ -- Schema management for Kafka topics
- **Kafka Connect** -- https://kafka.apache.org/documentation/#connect -- Connector framework for data integration
- **KRaft Mode** -- https://kafka.apache.org/documentation/#kraft -- ZooKeeper-less Kafka metadata management
- **Kafka Exactly-Once** -- https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ -- Idempotent producers and transactions
- **Redpanda** -- https://docs.redpanda.com/ -- Kafka-compatible streaming platform in C++
- **WarpStream** -- https://docs.warpstream.com/ -- Kafka-compatible with zero disks architecture
- **Kafdrop** -- https://github.com/obsidiandynamics/kafdrop -- Kafka web UI for topic inspection

## Apache Flink (10 refs)
- **Flink Documentation** -- https://nightlies.apache.org/flink/flink-docs-stable/ -- Official Flink reference
- **Flink SQL** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/sql/overview/ -- Stream processing with SQL
- **Flink State Management** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/stateful-stream-processing/ -- Checkpointing and state backends
- **Flink CDC** -- https://nightlies.apache.org/flink/flink-cdc-docs-stable/ -- Change data capture connectors for Flink
- **Flink Kubernetes Operator** -- https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-stable/ -- K8s-native Flink deployment
- **Decodable** -- https://docs.decodable.co/ -- Managed Flink platform for stream processing
- **Amazon Managed Flink** -- https://docs.aws.amazon.com/managed-flink/ -- AWS managed Apache Flink service
- **Flink Table API** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/tableapi/ -- Relational API for batch and stream
- **Flink Savepoints** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/savepoints/ -- Versioned snapshots for upgrades
- **Flink Watermarks** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/ -- Event time processing and late data

## CDC and Debezium (10 refs)
- **Debezium Documentation** -- https://debezium.io/documentation/ -- Open-source CDC platform reference
- **Debezium Connectors** -- https://debezium.io/documentation/reference/stable/connectors/ -- Database-specific CDC connectors
- **Debezium Server** -- https://debezium.io/documentation/reference/stable/operations/debezium-server.html -- Standalone CDC without Kafka Connect
- **Debezium Outbox Pattern** -- https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html -- Reliable event publishing from databases
- **Fivetran** -- https://fivetran.com/docs -- Managed ELT with CDC from 300+ sources
- **Airbyte** -- https://docs.airbyte.com/ -- Open-source data integration with CDC support
- **AWS DMS** -- https://docs.aws.amazon.com/dms/ -- Database Migration Service with CDC
- **Maxwell** -- https://maxwells-daemon.io/ -- MySQL binlog CDC to Kafka/Kinesis
- **pg_logical** -- https://www.postgresql.org/docs/current/logical-replication.html -- PostgreSQL native logical replication
- **Estuary Flow** -- https://docs.estuary.dev/ -- Real-time CDC pipelines with exactly-once

## Exactly-Once Semantics (10 refs)
- **Kafka Transactions** -- https://kafka.apache.org/documentation/#semantics -- Transactional messaging guarantees
- **Flink Exactly-Once** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/connectors/datastream/kafka/#fault-tolerance -- End-to-end exactly-once with Kafka
- **Two-Phase Commit** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/internals/stream_checkpointing/ -- Distributed snapshot protocol
- **Idempotent Consumers** -- https://microservices.io/patterns/communication-style/idempotent-consumer.html -- Pattern for safe message reprocessing
- **Outbox Pattern** -- https://microservices.io/patterns/data/transactional-outbox.html -- Reliable messaging via database table
- **Deduplication Strategies** -- https://developer.confluent.io/patterns/event-processing/idempotent-writer/ -- Preventing duplicate processing
- **Kafka Consumer Groups** -- https://kafka.apache.org/documentation/#consumerconfigs -- Offset management and rebalancing
- **Flink Changelogs** -- https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/concepts/dynamic_tables/ -- Changelog stream processing model
- **At-Least-Once vs Exactly-Once** -- https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ -- Delivery guarantee tradeoffs
- **Saga Pattern** -- https://microservices.io/patterns/data/saga.html -- Distributed transaction management without 2PC
