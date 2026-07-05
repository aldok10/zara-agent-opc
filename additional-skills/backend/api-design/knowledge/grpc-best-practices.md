# gRPC Best Practices

## Protobuf Schema Design

### Field Numbering

- Fields 1-15: 1 byte tag. Reserve for frequently-set fields.
- Fields 16-2047: 2 bytes. Use for less common fields.
- Never reuse deleted field numbers. Use `reserved` to prevent accidental reuse.

```protobuf
message Order {
  reserved 4, 7;  // previously used, never reuse
  reserved "old_field_name";
  
  string id = 1;           // always set → low number
  string customer_id = 2;  // always set
  OrderStatus status = 3;  // always set
  string notes = 16;       // rarely set → higher number
}
```

### Enum Design

```protobuf
enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;  // required: default/unknown sentinel
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_SHIPPED = 3;
  ORDER_STATUS_DELIVERED = 4;
  ORDER_STATUS_CANCELLED = 5;
}
```

Rules: prefix with enum name, UNSPECIFIED = 0, UPPER_SNAKE_CASE values.

### Message Evolution

- Add fields: safe (new number, old clients ignore)
- Remove fields: use `reserved` on number + name
- Rename fields: safe (wire uses numbers, not names)
- Change type: BREAKING (wire format changes)
- Change number: BREAKING (existing data corrupts)

## Streaming Patterns

### Server Streaming — Backpressure

Client controls flow. Server sends until client stops reading or deadline expires.

```protobuf
rpc WatchOrders(WatchOrdersRequest) returns (stream OrderEvent);
```

Best practices:
- Include heartbeat messages (empty keepalive) every 30s
- Client reconnects with last-seen event ID
- Server respects client cancellation immediately

### Bidirectional — Ordering

```protobuf
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
```

Messages in each direction are independent. No guaranteed ordering across directions.

## Deadline Propagation

```
Client (deadline: 5s) → Service A (remaining: 4.8s) → Service B (remaining: 4.5s)
```

Rules:
1. Always propagate incoming deadline minus elapsed time
2. If no incoming deadline, set a reasonable default (30s for reads, 60s for writes)
3. Set shorter deadline than caller's — leave room for retries
4. Return DEADLINE_EXCEEDED immediately if incoming deadline already passed

## Error Details (google.rpc)

```protobuf
import "google/rpc/error_details.proto";

// Attach to Status:
// BadRequest.FieldViolation — input validation errors
// RetryInfo — how long to wait before retry
// ErrorInfo — stable error identifier + metadata
// ResourceInfo — which resource was involved
// PreconditionFailure — what precondition wasn't met
```

## Interceptor Chain Order

```
Client side: Auth → Retry → Timeout → Logging → [RPC]
Server side: [RPC] → Recovery → Validation → Auth → Logging → Metrics
```

## Performance Guidelines

| Setting | Recommendation |
|---------|---------------|
| Max message size | 4MB default; increase only with justification |
| Keepalive interval | 30s (client), 2h (server) |
| Max concurrent streams | 100 per connection |
| Connection pooling | 1 connection per backend host for most cases |
| Compression | gzip for payloads > 1KB |
