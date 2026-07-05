# gRPC Patterns

## When to Load

Designing gRPC services: protobuf schema modeling, streaming patterns, interceptor chains, deadline propagation, structured error handling with error details.

## Rules

1. Package naming: `company.service.v1`  -  version in package, not service name
2. Service names are PascalCase nouns: `OrderService`, not `OrderManager` or `Orders`
3. RPC names are PascalCase verbs: `CreateOrder`, `ListOrders`, `GetOrder`
4. Request/response messages are per-RPC: `CreateOrderRequest` / `CreateOrderResponse`  -  never share across RPCs
5. Always set deadlines on client calls  -  no deadline = potential infinite hang
6. Use `google.protobuf.FieldMask` for partial updates (equivalent to PATCH)
7. Repeated fields for collections  -  never use maps for ordered data
8. Reserve deleted field numbers forever  -  reuse causes wire-format corruption
9. Default page size 50, max 1000; use `page_token` (opaque string) for pagination
10. Return `google.rpc.Status` with details for structured errors; attach `BadRequest`, `ErrorInfo`, `RetryInfo` as needed

## Streaming Decision Matrix

| Pattern | When | Example |
|---------|------|---------|
| Unary | Single request → single response | `GetOrder` |
| Server streaming | One request → many responses | `WatchOrderStatus`, log tailing |
| Client streaming | Many requests → one response | Bulk upload, telemetry ingestion |
| Bidirectional | Many ↔ many | Chat, collaborative editing |

## Protobuf Schema Rules

| Rule | Rationale |
|------|-----------|
| Fields 1-15 use 1 byte on wire | Reserve for frequently-set fields |
| Use `optional` for fields that may be absent | Distinguishes "not set" from default value |
| Enums start with `UNKNOWN = 0` | Wire default is 0; unknown is safe sentinel |
| Wrapper types for nullable primitives | `google.protobuf.Int32Value` vs bare `int32` |
| Avoid `oneof` with > 5 variants | Consider separate messages instead |
| Timestamp = `google.protobuf.Timestamp` | Don't invent custom time formats |

## Anti-Patterns

- Sharing `Request`/`Response` messages across RPCs  -  blocks independent evolution
- Missing deadlines on internal service calls  -  cascading timeouts
- Using `string` for enums  -  loses type safety and validation
- Returning errors via response fields instead of gRPC status codes
- Large payloads (>4MB default) without chunking or streaming
- `import public`  -  creates fragile transitive dependencies

## Error Handling

```
Status code mapping:
  NOT_FOUND        → resource doesn't exist
  ALREADY_EXISTS   → duplicate creation attempt
  INVALID_ARGUMENT → bad field value (attach FieldViolation)
  FAILED_PRECONDITION → wrong state for operation
  PERMISSION_DENIED → authn ok, authz failed
  UNAUTHENTICATED  → no/invalid credentials
  RESOURCE_EXHAUSTED → rate limited or quota exceeded
  DEADLINE_EXCEEDED → timeout (propagate to client)
  UNAVAILABLE      → transient, client should retry with backoff
```

## Verification

- `buf lint` passes with default rules
- `buf breaking` detects no breaking changes against previous version
- All RPCs have request/response message pairs (not reused)
- Deadlines set on all client calls in integration tests
- Error details attached for INVALID_ARGUMENT and FAILED_PRECONDITION
