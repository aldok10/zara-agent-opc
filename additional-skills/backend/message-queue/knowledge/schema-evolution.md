---
type: fact
title: "Schema Evolution"
---

# Schema Evolution

Managing message schema changes across producers and consumers without breaking compatibility. Schema Registry enforces rules, serialization formats (Avro, Protobuf) enable evolution.

## Schema Registry

### Purpose
- Central repository for message schemas (Avro, Protobuf, JSON Schema)
- Validates compatibility before allowing new schema versions
- Provides schema ID in message header -- consumers look up schema by ID
- Decouples producer/consumer deploy cycles (independent evolution)

### Architecture
```
Producer -> Schema Registry (validate + register schema) -> get schema ID
Producer -> Broker (message with schema ID prefix)
Consumer -> Broker (read message, extract schema ID)
Consumer -> Schema Registry (fetch schema by ID) -> deserialize
```

### Implementations
- Confluent Schema Registry (Kafka-native, most mature)
- Karapace (open-source, Confluent-compatible API)
- AWS Glue Schema Registry (AWS-managed)
- Buf Schema Registry (Protobuf-focused)

## Compatibility Modes

| Mode | Rule | Producer Deploy | Consumer Deploy |
|------|------|-----------------|-----------------|
| BACKWARD | New schema can read old data | Consumer first | Safe |
| FORWARD | Old schema can read new data | Producer first | Safe |
| FULL | Both backward + forward | Either order | Safest |
| NONE | No validation | Dangerous | Breaks |

### BACKWARD (Default, Recommended)
- New consumer can read messages from old producer
- Allowed: add optional fields, remove fields with defaults
- Forbidden: add required fields, change field types
- Deploy order: update consumers first, then producers

### FORWARD
- Old consumer can read messages from new producer
- Allowed: add fields (old consumer ignores), remove optional fields
- Forbidden: remove required fields old consumer needs

### FULL (Strictest, Best for Production)
- Both old and new can read each other's data
- Allowed: add optional fields with defaults
- Forbidden: remove any field, change types, add required fields

## Avro Schema Evolution

### Safe Changes (FULL compatible)
```json
// V1
{"type": "record", "name": "OrderEvent", "fields": [
  {"name": "order_id", "type": "string"},
  {"name": "amount", "type": "double"},
  {"name": "currency", "type": "string"}
]}

// V2 - Added optional field with default
{"type": "record", "name": "OrderEvent", "fields": [
  {"name": "order_id", "type": "string"},
  {"name": "amount", "type": "double"},
  {"name": "currency", "type": "string"},
  {"name": "region", "type": ["null", "string"], "default": null}
]}
```

### Breaking Changes (NEVER in production)
- Removing a field without default
- Renaming a field (treated as remove + add)
- Changing field type (int -> string)
- Adding required field without default

## Protobuf Schema Evolution

### Safe Changes
- Add new fields (new field numbers)
- Deprecate fields (mark reserved, keep number allocated)
- Add enum values at end

### Rules
```protobuf
// V1
message OrderEvent {
  string order_id = 1;
  double amount = 2;
  string currency = 3;
}

// V2 - Safe: new optional field
message OrderEvent {
  string order_id = 1;
  double amount = 2;
  string currency = 3;
  optional string region = 4;  // New field, unknown to old consumers (ignored)
  reserved 5;  // Reserved for removed field (never reuse numbers)
}
```

### Protobuf Rules
- Never change field numbers
- Never reuse field numbers (use `reserved`)
- Never change field types for existing numbers
- `optional` keyword makes all new fields safe to add

## Migration Strategies

### In-Place Evolution (Preferred)
1. Register new schema version with Registry
2. Compatibility check passes automatically
3. Deploy consumers (can read both old + new)
4. Deploy producers (start writing new format)
5. Old messages in topic still readable (backward compat)

### Topic Versioning (Breaking Changes)
1. Create new topic: `orders.v2`
2. Deploy new consumers on `orders.v2`
3. Deploy bridge: reads `orders.v1`, transforms, writes `orders.v2`
4. Switch producers to `orders.v2`
5. Decommission bridge + old topic after drain

### Schema Migration Checklist
- [ ] New schema registered in Schema Registry
- [ ] Compatibility mode enforced (FULL recommended)
- [ ] CI check: schema compatibility validated in pipeline
- [ ] Consumer deployed first (if BACKWARD mode)
- [ ] Old messages in topic still deserializable
- [ ] No field number reuse (Protobuf) or field removal without default (Avro)

## CI Integration

```yaml
# Example: schema compatibility check in CI
- name: Check Schema Compatibility
  run: |
    curl -X POST "http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest" \
      -H "Content-Type: application/vnd.schemaregistry.v1+json" \
      -d @schemas/order-event.avsc
    # Returns: {"is_compatible": true}
```

## Common Pitfalls

1. **No schema validation at producer**: garbage data enters topic, breaks all consumers
2. **Removing fields without default**: old consumers crash on new messages
3. **Using NONE compatibility mode**: "move fast" today, outage tomorrow
4. **Schema in code only (no Registry)**: impossible to validate compatibility pre-deploy
5. **JSON without schema**: no evolution guarantees, string field becomes int silently
