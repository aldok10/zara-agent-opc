---
type: fact
title: "Schema Registry - Compatibility Modes, Subject Strategies, Migration"
---

# Schema Registry

The Schema Registry provides a centralized store for schemas used in event streaming, enabling schema evolution without breaking consumers.

## Architecture

```
Producer → Serializer → Schema Registry → Kafka Broker
                              ↕
Consumer → Deserializer → Schema Registry
```

- Schemas are registered by subject (logical grouping)
- Each schema gets a globally unique ID
- Serializers embed the schema ID in the message (first 5 bytes: magic byte + 4-byte ID)
- Consumers fetch schemas by ID for deserialization
- Registry stores schema history for compatibility checking
- Typically deployed as a separate service (Confluent Schema Registry, Apicurio, AWS Glue)

## Compatibility Modes

| Mode | Rule | Use Case |
|------|------|----------|
| **BACKWARD** | New schema can read data written by previous schema | Consumer-first deployments (deploy consumers before producers) |
| **BACKWARD_TRANSITIVE** | New schema can read data from ALL previous versions | Long-retention topics, reprocessing from earliest offset |
| **FORWARD** | Previous schema can read data written by new schema | Producer-first deployments (deploy producers before consumers) |
| **FORWARD_TRANSITIVE** | ALL previous schemas can read new data | Independent producer rollouts |
| **FULL** | Both backward and forward compatible with previous | Recommended default — safest for independent deployments |
| **FULL_TRANSITIVE** | Both backward and forward with ALL versions | Strictest, long-lived topics with many consumer versions |
| **NONE** | No compatibility checking | Development only, not for production |

### Compatibility Rules in Practice

**Backward-compatible changes (safe for BACKWARD mode):**
- Add optional field with default value
- Remove a field (consumers ignore unknown fields)

**Forward-compatible changes (safe for FORWARD mode):**
- Add a field (old readers ignore it)
- Remove optional field with default

**Breaking changes (fail all modes except NONE):**
- Change field type
- Rename a field
- Remove required field without default
- Change field from optional to required

## Subject Naming Strategies

Subjects group schemas logically. The strategy determines how subjects map to topics/records.

| Strategy | Subject Name Pattern | When to Use |
|----------|---------------------|-------------|
| **TopicNameStrategy** | `{topic}-key` / `{topic}-value` | One schema per topic (most common, default) |
| **RecordNameStrategy** | `{fully.qualified.record.name}` | Multiple event types per topic (event-carried state transfer) |
| **TopicRecordNameStrategy** | `{topic}-{fully.qualified.record.name}` | Multiple types per topic with per-topic evolution control |

### TopicNameStrategy (Default)

- Subject: `orders-value`, `orders-key`
- All messages on a topic must conform to the same schema
- Simple to reason about and enforce

### RecordNameStrategy

- Subject: `com.example.OrderCreated`, `com.example.OrderShipped`
- Multiple event types on one topic (e.g., all domain events on `orders-events`)
- Each type evolves independently
- Requires consumers to handle multiple schemas per topic

### TopicRecordNameStrategy

- Subject: `orders-events-com.example.OrderCreated`
- Combines topic isolation with per-type evolution
- Useful when the same record type appears on different topics with different evolution needs

## Schema Formats

| Format | Strengths | Weaknesses |
|--------|-----------|------------|
| **Avro** | Compact binary, excellent evolution support, schema resolution at read time | Requires schema for reading, less human-readable |
| **Protobuf** | Strong typing, code generation, cross-language, performant | More complex evolution rules, imports add management overhead |
| **JSON Schema** | Human-readable payloads, familiar tooling, easy debugging | Larger wire format, weaker evolution guarantees, slower serialization |

**Recommendation:** Avro for Kafka-native workloads, Protobuf for polyglot/gRPC ecosystems, JSON Schema for human-facing APIs or debugging-heavy flows.

## Schema Evolution Patterns

### Adding a Field

```json
// v1
{ "name": "Order", "fields": [
  {"name": "id", "type": "string"},
  {"name": "amount", "type": "double"}
]}

// v2 - backward compatible (new field has default)
{ "name": "Order", "fields": [
  {"name": "id", "type": "string"},
  {"name": "amount", "type": "double"},
  {"name": "currency", "type": "string", "default": "USD"}
]}
```

### Union Types (Avro)

```json
{"name": "middle_name", "type": ["null", "string"], "default": null}
```

Allows the field to be absent — critical for backward compatibility.

### Reserved Fields (Protobuf)

```protobuf
message Order {
  string id = 1;
  double amount = 2;
  reserved 3;  // was: removed_field
  string currency = 4;
}
```

Prevents accidental reuse of removed field numbers.

## Migration Strategies

### Dual-Write

1. Producer writes to both old topic (v1 schema) and new topic (v2 schema)
2. Consumers migrate from old topic to new topic one by one
3. Once all consumers moved, decommission old topic

**Pros:** zero downtime, consumer-paced migration
**Cons:** temporary duplicate writes, ordering guarantees may differ between topics

### Lazy Migration

1. Register new schema version (must be compatible)
2. Deploy new producers writing v2
3. Consumers use schema resolution — old messages read with v2 schema (defaults fill gaps)
4. Over time, all messages in topic converge to v2

**Pros:** no duplicate topics, simple operational model
**Cons:** requires strict compatibility, consumers must handle mixed versions during transition

### Topic Versioning

1. Create new topic (`orders-v2`)
2. Backfill from old topic with transformation
3. Migrate consumers to new topic
4. Deprecate old topic

**Pros:** clean break for major schema changes
**Cons:** reprocessing cost, consumer coordination required

## Kafka Connect Integration

- Converters (`AvroConverter`, `ProtobufConverter`, `JsonSchemaConverter`) interact directly with Schema Registry
- Auto-registers schemas when connectors produce data
- Source connectors: schema derived from source system (database columns → Avro fields)
- Sink connectors: use schema from registry to deserialize and map to target
- Configure: `key.converter.schema.registry.url` and `value.converter.schema.registry.url`

### SMT (Single Message Transforms) Considerations

- Transforms that alter structure (add/remove fields, rename) create new schemas
- New schemas must pass compatibility check — plan transforms with evolution in mind
- InsertField, ReplaceField, and Cast SMTs all trigger re-registration

## Operational Practices

- Set compatibility mode at subject level, not globally (different topics have different needs)
- Use CI/CD to validate schema compatibility before deployment (`mvn schema-registry:compatibility`)
- Monitor: schema count per subject, compatibility check failures, registry latency
- Back up registry schemas (they live in a Kafka topic: `_schemas`)
- Set `auto.register.schemas=false` in production producers — register via CI pipeline only
