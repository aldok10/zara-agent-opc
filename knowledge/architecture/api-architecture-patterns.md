# API Architecture Patterns

## Decision Matrix

| Pattern | Best For | Avoid When | Latency | Complexity |
|---------|----------|------------|---------|------------|
| REST | Public APIs, CRUD, caching | Real-time, high-throughput internal | Medium | Low |
| gRPC | Service-to-service, streaming | Browser clients, public APIs | Low | Medium |
| GraphQL | Multi-client, mobile, varied shapes | Simple CRUD, internal services | Medium | High |
| Event-Driven | Decoupling, fan-out, eventual consistency | Need immediate response | High (async) | High |
| Webhooks | External notifications, partner integrations | Reliability-critical flows | Variable | Low |

## REST

Universal, cacheable, stateless. HTTP verbs map to CRUD. Best default for public APIs.

Strengths: caching (HTTP), tooling, discoverability, versioning strategies well-understood.
Weaknesses: over/under-fetching, N+1 for nested resources, no streaming.

```
GET /api/orders/123
Accept: application/json

200 OK
{ "id": 123, "status": "shipped", "items": [...] }
```

## gRPC

Binary protocol (protobuf), HTTP/2, bidirectional streaming. 5-10x faster than REST for internal calls.

Strengths: code generation, strong typing, streaming, multiplexing, small payloads.
Weaknesses: browser support (needs grpc-web proxy), debugging harder, tooling less universal.

```protobuf
service OrderService {
  rpc GetOrder(OrderRequest) returns (Order);
  rpc StreamUpdates(OrderRequest) returns (stream OrderEvent);
}
```

## GraphQL

Single endpoint, client-defined response shape. Solves over/under-fetching for varied clients.

Strengths: exactly the data you need, introspection, schema as contract, great for mobile.
Weaknesses: caching hard (POST everything), N+1 at resolver level, complexity budget, rate limiting difficult.

```graphql
query {
  order(id: "123") {
    status
    items { name quantity }
    customer { name }
  }
}
```

## Event-Driven (Async)

Producers emit events, consumers process independently. Decouples services temporally and spatially.

Sub-patterns:
- **Pub/Sub**: broadcast to multiple consumers (notifications, analytics)
- **Event Sourcing**: events as source of truth, rebuild state from log
- **CQRS**: separate read/write models, optimize each independently

Strengths: decoupling, scalability, audit trail, temporal decoupling.
Weaknesses: eventual consistency, debugging distributed flows, ordering guarantees, exactly-once is myth.

```json
{
  "event_type": "order.shipped",
  "event_id": "uuid-v7",
  "timestamp": "2024-03-15T10:00:00Z",
  "data": { "order_id": 123, "tracking": "1Z999..." }
}
```

## Webhooks

HTTP callbacks for external integrations. Simple, but unreliable without retry logic.

Requirements: idempotency keys, HMAC signature verification, retry with exponential backoff, dead letter queue.

## How to Choose

1. **Who is the consumer?** Browser/mobile/public → REST or GraphQL. Internal service → gRPC or events.
2. **Latency requirement?** Sync response needed → REST/gRPC/GraphQL. Can be async → events.
3. **Data shape varies by client?** Yes → GraphQL. No → REST.
4. **High throughput internal?** gRPC.
5. **Need decoupling?** Events.
6. **Default**: REST. Add complexity only when proven necessary.
