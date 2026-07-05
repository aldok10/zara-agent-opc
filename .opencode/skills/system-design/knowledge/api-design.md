---
type: fact
title: "API Design - REST, gRPC, GraphQL, AsyncAPI"
---

# API Design

APIs are contracts. Design for the consumer, not the implementation. Backward compatibility is non-negotiable once published.

## REST

### Richardson Maturity Model

| Level | Description | Example |
|-------|-------------|---------|
| 0 | Single endpoint, RPC-style | POST /api with action in body |
| 1 | Resources | /users, /orders (nouns, not verbs) |
| 2 | HTTP verbs + status codes | GET /users/123 returns 200; DELETE returns 204 |
| 3 | HATEOAS (hypermedia controls) | Response includes links to related actions |

Most production APIs target Level 2. Level 3 (HATEOAS) adds discoverability but increases response size and client complexity. Worth it for public APIs with diverse consumers; overkill for internal microservices.

### Versioning strategies

| Strategy | Mechanism | Trade-off |
|----------|-----------|-----------|
| URL path | `/v1/users` | Simple, explicit. Breaks URI permanence. |
| Header | `Accept: application/vnd.api+json;version=2` | Clean URLs. Harder to test in browser. |
| Query param | `/users?version=2` | Easy to test. Pollutes query space. |
| Content negotiation | `Accept: application/vnd.company.v2+json` | Proper HTTP. Complex routing. |

**Recommendation**: URL path for external/public APIs (simple for consumers). Header for internal APIs (cleaner, supports gradual migration).

### Resource design

- Plural nouns: `/users`, `/orders`, not `/getUser`.
- Nested resources for strong ownership: `/users/123/addresses`.
- Flat resources for independent entities: `/addresses/456` (not nested 3+ levels deep).
- Use query params for filtering, sorting, pagination: `/users?status=active&sort=-created_at`.

### Status codes that matter

- 200: success with body. 201: created (include Location header). 204: success, no body.
- 400: client sent invalid input. 401: not authenticated. 403: authenticated but not authorized.
- 404: resource not found. 409: conflict (duplicate, state violation). 422: semantically invalid.
- 429: rate limited (include Retry-After header). 500: server error. 503: temporarily unavailable.

## gRPC

### When to use

- Service-to-service communication (internal microservices).
- High-throughput, low-latency requirements (2-10x faster than REST/JSON).
- Streaming: server-push, client-push, or bidirectional.
- Polyglot environments (codegen for 10+ languages from one .proto file).

### When NOT to use

- Browser clients without a proxy (gRPC-Web adds complexity).
- Public APIs for third-party developers (REST is more accessible).
- Simple CRUD where HTTP/JSON suffices.

### Protobuf best practices

- Never reuse field numbers (even after deleting a field — use `reserved`).
- Use `optional` for fields that might not be set (explicit presence).
- Wrap primitive types (`google.protobuf.Int32Value`) when null vs zero matters.
- Keep messages focused. Avoid god-messages with 50+ fields.
- Version via new service definitions, not message field gymnastics.

### Streaming patterns

| Pattern | Direction | Use case |
|---------|-----------|----------|
| Unary | Request → Response | Standard RPC |
| Server streaming | Request → stream of responses | Real-time updates, large result sets |
| Client streaming | Stream of requests → Response | File upload, batch processing |
| Bidirectional | Stream ↔ Stream | Chat, collaborative editing |

### Deadlines and timeouts

Always set deadlines. A missing deadline propagates infinitely through the call chain. Typical: 5s for user-facing, 30s for batch operations. Propagate remaining deadline to downstream calls.

### Interceptors

Middleware pattern for gRPC. Use for: auth token validation, request logging, metrics collection, rate limiting, retry logic. Chain interceptors in consistent order across services.

## GraphQL

### Schema design

- Types map to domain concepts, not database tables.
- Use `ID` type for identifiers. Use custom scalars for dates, URLs, emails.
- Input types for mutations (separate from output types).
- Connections pattern for pagination (edges + pageInfo + totalCount).

### N+1 problem

A query requesting `users { posts { comments } }` naively fires: 1 query for users + N queries for posts + N*M queries for comments.

**Solution: DataLoader**. Batches individual lookups into single queries per tick. Key pattern:

1. Collect all IDs requested in one event-loop tick.
2. Execute single batch query (WHERE id IN (...)).
3. Map results back to individual resolvers.

DataLoader is per-request scoped (never shared across requests — stale cache).

### Federation (Apollo Federation)

Split one graph across multiple services. Each service owns part of the schema.

- `@key` directive: declares entity primary key.
- `extend type`: one service adds fields to another service's type.
- Gateway: composes schemas, routes queries, executes query plans.
- Scale: supports 50+ subgraphs in production (Netflix, Expedia).

### Performance controls

- Query depth limiting (max 7-10 levels).
- Query complexity scoring (each field has a cost; reject if total exceeds budget).
- Persisted queries: client sends hash, server looks up pre-approved query. Blocks arbitrary queries.
- Response caching: CDN-cacheable with `@cacheControl` directives per field.

### When NOT to use

- Simple APIs with fixed, known consumers (REST is simpler to operate).
- File upload heavy (GraphQL multipart spec is awkward).
- Real-time-only requirements (subscriptions work but WebSockets/SSE are simpler).

## AsyncAPI

### Purpose

OpenAPI equivalent for event-driven architectures. Describes message channels, message formats, and protocols.

### Core concepts

- Channels: topics/queues where messages flow (e.g., `orders/created`).
- Messages: payload + headers + correlation ID.
- Protocols: Kafka, AMQP, MQTT, WebSocket, NATS.
- Bindings: protocol-specific configuration (Kafka partition key, AMQP exchange type).

### When to use

- Documenting event-driven microservice contracts.
- Code generation for producers/consumers.
- Event catalog for discoverability.
- Contract testing: validate messages against schema.

## API-First Design

### Process

1. Write the API spec (OpenAPI/AsyncAPI) before any code.
2. Review with consumers (frontend, mobile, partner teams).
3. Generate server stubs and client SDKs.
4. Implement against the generated interface.
5. Contract tests verify implementation matches spec.

### Benefits

- Parallel development (frontend and backend work simultaneously against spec).
- Early feedback (catch design issues before code exists).
- Consistent documentation (spec IS the docs).
- SDK generation eliminates hand-written clients.

## OpenAPI 3.1

Key improvements over 3.0:

- Full JSON Schema compatibility (no more subset/superset confusion).
- Webhooks as first-class concept.
- `pathItems` for reusable path definitions.
- `null` type support (no more `nullable: true` workaround).

### Tooling

- Spec-first: Stoplight, Swagger Editor, Redocly.
- Code-first: springdoc-openapi, FastAPI (auto-generates), tsoa.
- Validation: Spectral (linting rules), oasdiff (breaking change detection).
- Mocking: Prism, WireMock.

## API Gateway Patterns

### Responsibilities

- Routing: map external paths to internal services.
- Authentication: validate tokens before reaching services.
- Rate limiting: protect services from abuse.
- Request transformation: add headers, rewrite paths, merge responses.
- Observability: centralized access logs, latency metrics.

### Patterns

| Pattern | Description | Use case |
|---------|-------------|----------|
| Edge gateway | Single entry point for all external traffic | Public APIs |
| BFF (Backend for Frontend) | Separate gateway per client type | Mobile vs web vs partner |
| Service mesh gateway | Internal service-to-service routing | Istio, Linkerd |
| Federated gateway | GraphQL composition layer | Multi-team graph |

### Products

- Cloud-native: AWS API Gateway, Google Apigee, Azure API Management.
- Self-hosted: Kong, APISIX, Tyk, Envoy.
- Lightweight: Traefik, Caddy (for simpler setups).

## Rate Limiting Strategies

### Algorithms

| Algorithm | Behavior | Best for |
|-----------|----------|----------|
| Fixed window | N requests per time window | Simple, some burst at window edges |
| Sliding window log | Track timestamps of each request | Accurate, memory-intensive |
| Sliding window counter | Weighted average of current + previous window | Good balance of accuracy and memory |
| Token bucket | Tokens refill at steady rate, burst up to bucket size | Allow controlled bursts |
| Leaky bucket | Requests processed at fixed rate, queued if exceeding | Smooth output rate |

### Implementation

- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Distributed: Redis INCR with TTL, or dedicated service (Envoy rate limit service).
- Tiered: different limits per plan (free: 100/min, pro: 1000/min, enterprise: 10000/min).
- Graceful: return 429 with `Retry-After` header. Never silently drop requests.

## Idempotency Keys

### Problem

Network failures cause retries. Without idempotency, retries create duplicates (double charges, double orders).

### Pattern

1. Client generates unique key (UUID v4) and sends in `Idempotency-Key` header.
2. Server stores key → response mapping (Redis with TTL, or database).
3. On retry with same key: return stored response, don't re-execute.
4. TTL: 24-72 hours (long enough for retry storms, short enough for cleanup).

### Implementation details

- Store request fingerprint alongside key (reject same key with different body).
- Return 409 if same key used with different parameters.
- Only apply to non-idempotent operations (POST, PATCH). GET/PUT/DELETE are naturally idempotent.
- Stripe's approach: lock on key, execute, store result, unlock. Concurrent duplicates get 409.

## Pagination

### Cursor-based (recommended)

- Encode opaque cursor (base64 of last item's sort key).
- Request: `GET /items?after=abc123&limit=20`.
- Response includes `nextCursor` (null if last page).
- Stable under concurrent inserts/deletes. No skipped or duplicated items.
- Cannot jump to page N (trade-off for correctness).

### Offset-based

- Request: `GET /items?offset=40&limit=20`.
- Simple to implement. Supports "jump to page 5."
- Breaks under mutations: insert at position 10 shifts all subsequent items.
- Slow at large offsets: database still scans skipped rows (OFFSET 100000 = scan 100K rows).

### Keyset (seek)

- Request: `GET /items?created_at_lt=2024-01-15T10:00:00Z&limit=20`.
- Uses WHERE clause instead of OFFSET. Index-backed. Fast at any depth.
- Requires a unique, sortable column. Same stability as cursor but transparent encoding.

### Choosing

- User-facing lists with infinite scroll: cursor.
- Admin dashboards needing page jumps: offset (small datasets only).
- High-volume feeds, event logs: keyset.
- Always return total count separately (COUNT query or pre-computed) if consumers need it.
