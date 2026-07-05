# References

## Apache Kafka (8 refs)

- **Kafka Documentation** -- https://kafka.apache.org/documentation/ -- Complete Apache Kafka reference
- **Kafka Design** -- https://kafka.apache.org/documentation/#design -- Architecture and internals
- **Kafka Streams** -- https://kafka.apache.org/documentation/streams/ -- Stream processing library
- **Kafka Connect** -- https://kafka.apache.org/documentation/#connect -- Data integration framework
- **Schema Registry** -- https://docs.confluent.io/platform/current/schema-registry/ -- Schema management for Kafka
- **Kafka Consumer Groups** -- https://kafka.apache.org/documentation/#consumerconfigs -- Consumer configuration
- **Kafka Exactly-Once** -- https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ -- EOS semantics explained
- **KRaft Mode** -- https://kafka.apache.org/documentation/#kraft -- ZooKeeper-less Kafka

## RabbitMQ (6 refs)

- **RabbitMQ Documentation** -- https://www.rabbitmq.com/docs -- Complete broker reference
- **RabbitMQ Tutorials** -- https://www.rabbitmq.com/tutorials -- Exchange types and routing patterns
- **RabbitMQ Streams** -- https://www.rabbitmq.com/docs/streams -- Append-only log in RabbitMQ
- **RabbitMQ Clustering** -- https://www.rabbitmq.com/docs/clustering -- HA and cluster formation
- **Quorum Queues** -- https://www.rabbitmq.com/docs/quorum-queues -- Replicated FIFO queues
- **Dead Letter Exchanges** -- https://www.rabbitmq.com/docs/dlx -- Failed message handling

## NATS (5 refs)

- **NATS Documentation** -- https://docs.nats.io/ -- Complete NATS reference
- **NATS JetStream** -- https://docs.nats.io/nats-concepts/jetstream -- Persistent messaging
- **NATS Key-Value** -- https://docs.nats.io/nats-concepts/jetstream/key-value-store -- Distributed KV store
- **NATS Patterns** -- https://docs.nats.io/nats-concepts/core-nats/queue -- Queue groups and fan-out
- **NATS vs Kafka** -- https://docs.nats.io/compare/nats-kafka -- Architectural comparison

## Event Sourcing (6 refs)

- **Event Sourcing Pattern** -- https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing -- Microsoft pattern reference
- **EventStoreDB** -- https://developers.eventstore.com/ -- Purpose-built event store database
- **Marten Events** -- https://martendb.io/events/ -- Event sourcing on PostgreSQL (.NET)
- **Axon Framework** -- https://docs.axoniq.io/reference-guide/ -- Java CQRS/ES framework
- **Event Modeling** -- https://eventmodeling.org/ -- System design methodology
- **Prooph Event Store** -- https://github.com/prooph/event-store -- PHP event sourcing

## Outbox Pattern (5 refs)

- **Transactional Outbox** -- https://microservices.io/patterns/data/transactional-outbox.html -- Pattern definition
- **Debezium** -- https://debezium.io/documentation/ -- CDC for outbox implementation
- **Outbox with PostgreSQL** -- https://www.postgresql.org/docs/current/logicaldecoding.html -- Logical decoding for CDC
- **Polling Publisher** -- https://microservices.io/patterns/data/polling-publisher.html -- Alternative to CDC
- **Wolverine Outbox** -- https://wolverine.netlify.app/guide/durability/ -- .NET transactional outbox

## Idempotency & Delivery (5 refs)

- **Idempotent Consumer** -- https://microservices.io/patterns/communication-style/idempotent-consumer.html -- Handling duplicate messages
- **At-Least-Once Delivery** -- https://www.cloudcomputingpatterns.org/at_least_once_delivery/ -- Delivery guarantee pattern
- **Stripe Idempotency** -- https://stripe.com/docs/api/idempotent_requests -- Real-world implementation
- **Message Deduplication** -- https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html -- SQS dedup approach
- **Exactly-Once Processing** -- https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/ -- How Kafka achieves EOS

## Cloud Managed Services (4 refs)

- **AWS SQS** -- https://docs.aws.amazon.com/sqs/ -- Managed message queue
- **AWS SNS** -- https://docs.aws.amazon.com/sns/ -- Pub/sub notification service
- **Google Pub/Sub** -- https://cloud.google.com/pubsub/docs -- Managed messaging service
- **Azure Service Bus** -- https://learn.microsoft.com/en-us/azure/service-bus-messaging/ -- Enterprise message broker

## Schema Evolution (4 refs)

- **Avro Specification** -- https://avro.apache.org/docs/ -- Binary serialization with schema evolution
- **Protobuf** -- https://protobuf.dev/programming-guides/proto3/ -- Schema-first serialization
- **Schema Compatibility** -- https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html -- Forward/backward compatibility rules
- **CloudEvents** -- https://cloudevents.io/ -- Standard event format specification

## Monitoring & Operations (4 refs)

- **Kafka Monitoring** -- https://kafka.apache.org/documentation/#monitoring -- JMX metrics reference
- **Conduktor** -- https://www.conduktor.io/kafka/ -- Kafka management platform
- **RabbitMQ Management** -- https://www.rabbitmq.com/docs/management -- Monitoring plugin
- **Redpanda** -- https://docs.redpanda.com/ -- Kafka-compatible streaming platform
