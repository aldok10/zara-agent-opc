# DynamoDB

Single-table design, GSI overloading, streams, cost optimization, and access pattern modeling.

## When to Use

- Designing DynamoDB table schemas from access patterns
- GSI strategy and overloading
- DynamoDB Streams for event-driven processing
- Cost optimization (RCU/WCU, on-demand vs provisioned)
- Migration from relational to DynamoDB
- DAX caching layer decisions

## Rules

1. Start with access patterns, not entities. List every query before designing keys.
2. Single-table design is the default for related entities accessed together; multi-table only for fully independent services.
3. PK must provide even distribution; avoid hot partitions. Use composite keys: `ENTITY#id`.
4. SK enables range queries and entity overloading within a partition: `ORDER#2026-01-15#uuid`.
5. GSI is a full table copy; every GSI doubles write cost. Maximum 20 GSIs per table but aim for <5.
6. GSI overloading: reuse GSI with generic attribute names (`GSI1PK`, `GSI1SK`) mapped to different entity access patterns.
7. On-demand capacity for unpredictable/spiky workloads; provisioned + auto-scaling for steady workloads (30-40% cheaper).
8. Use `ProjectionExpression` always; never scan full items when only 2 attributes needed.
9. Batch operations (`BatchGetItem`, `BatchWriteItem`) max 25 items/100 items; handle `UnprocessedItems` with exponential backoff.
10. TTL for automatic deletion of expired items; always set on ephemeral data (sessions, events, cache).

## Access Pattern Modeling

```
Entity: User
  - Get user by ID:           PK=USER#123, SK=PROFILE
  - Get user orders:          PK=USER#123, SK=begins_with(ORDER#)
  - Get user by email:        GSI1PK=EMAIL#alice@example.com, GSI1SK=USER

Entity: Order
  - Get order by ID:          PK=ORDER#456, SK=METADATA
  - Get order items:          PK=ORDER#456, SK=begins_with(ITEM#)
  - Orders by date (user):    PK=USER#123, SK=ORDER#2026-01-15#456
  - Orders by status:         GSI2PK=STATUS#pending, GSI2SK=2026-01-15#ORDER#456
```

## Patterns

### Single-Table Item Structure
```json
{
  "PK": "USER#123",
  "SK": "ORDER#2026-01-15#abc",
  "GSI1PK": "STATUS#pending",
  "GSI1SK": "2026-01-15#ORDER#abc",
  "entityType": "Order",
  "total": 5999,
  "items": ["SKU#A1", "SKU#B2"],
  "TTL": 1767225600
}
```

### Transaction (Multi-Item Atomic)
```javascript
await dynamodb.transactWrite({
  TransactItems: [
    { Put: { TableName: "app", Item: orderItem } },
    { Update: {
        TableName: "app",
        Key: { PK: "USER#123", SK: "PROFILE" },
        UpdateExpression: "ADD orderCount :one",
        ExpressionAttributeValues: { ":one": 1 }
    }},
    { ConditionCheck: {
        TableName: "app",
        Key: { PK: "INVENTORY#SKU-A1", SK: "STOCK" },
        ConditionExpression: "quantity >= :qty",
        ExpressionAttributeValues: { ":qty": 1 }
    }}
  ]
});
```

### DynamoDB Streams + Lambda
```
Table -> Stream (NEW_AND_OLD_IMAGES) -> Lambda -> downstream
- Use for: materialized views, search index sync, cross-region replication
- Guarantee: at-least-once, ordered per partition key
- Handle: deduplication via idempotency key in downstream
```

## Cost Optimization

| Strategy | Savings |
|----------|---------|
| On-demand -> provisioned + autoscaling (steady traffic) | 30-40% |
| Smaller items (compress, remove redundant attributes) | Linear with size |
| GSI projection: KEYS_ONLY or INCLUDE (not ALL) | Proportional |
| TTL for auto-expiry vs manual deletes | Free deletion |
| DAX for read-heavy (>10:1 read/write ratio) | Reduces RCU 90%+ |
| Reserved capacity (1yr/3yr) for base load | 50-75% |

## Anti-Patterns

- Scan operations in application code (always Query with key conditions)
- Large items (>100KB); store blobs in S3, reference in DynamoDB
- Using `FilterExpression` as a substitute for proper key design (consumes RCU before filtering)
- Hot partition: single PK receiving >1000 WCU/3000 RCU (use write sharding: `PK#shard-N`)
- Relational modeling (normalize then join with multiple queries) instead of denormalized single-table

## Verification

- Check consumed capacity with `ReturnConsumedCapacity: 'TOTAL'` on critical queries
- CloudWatch: `ConsumedReadCapacityUnits`, `ThrottledRequests`, `SystemErrors`
- Validate key design handles ALL access patterns before implementation
- Test with `NoSQL Workbench` for data modeling visualization
- Verify GSI propagation delay is acceptable for use case (eventually consistent)
