# API Design: Architecture & Design

Deep-dive reference for designing APIs that scale and stay maintainable.

## Protocol Choice

- **REST** (~83% of public APIs): resource-oriented, HTTP verbs (GET/POST/PUT/PATCH/DELETE), status codes, cacheable via HTTP, universal tooling, HATEOAS optional. Default for public/external APIs.
- **GraphQL**: single endpoint, client picks fields. Great BFF for complex frontends  --  kills over/under-fetching. Costs: **N+1 at resolver level** (use DataLoader), needs query complexity/depth limits, caching is harder.
- **gRPC**: service-to-service. Protobuf (**~10x smaller than JSON**), HTTP/2 streaming, codegen for many langs. Not browser-friendly without a proxy (grpc-web/Envoy).
- **tRPC**: end-to-end TypeScript type safety in a monorepo, zero schema/codegen overhead. TS-only  --  not for polyglot.

**Decision**: Public API = REST. Complex frontend = GraphQL/tRPC. Internal microservice = gRPC. Real systems often use several.

## Versioning

- **URL path** (`/v1/users`): simplest, most visible, easy routing/caching. Most common.
- **Header** (`Accept-Version: 2`): cleanest URLs, content-negotiation-friendly, less discoverable.
- **Query param** (`?version=2`): easy but pollutes and complicates caching.

Pick URL path unless you have a strong reason. Never ship breaking changes without a version bump.

## Rate Limiting

- **Token bucket**: allows bursts up to bucket size, refills at fixed rate. Good default.
- **Sliding window**: smooths traffic, no burst at window edges.
- Respond **429 Too Many Requests** + `Retry-After` header. Return limit/remaining/reset headers.

## Pagination

- **Cursor-based**: opaque cursor pointing at last seen item. Consistent under inserts/deletes, performant at depth. Preferred.
- **Offset-based** (`?offset=100&limit=20`): simple, but **drifts** when rows are inserted/deleted mid-scroll and slow at high offsets. OK for small/static datasets.

## Error Format

Use **RFC 7807 Problem Details**:
```json
{ "type": "https://api.x/errors/insufficient-funds",
  "title": "Insufficient funds", "status": 402,
  "detail": "Balance 30 < required 50", "instance": "/accounts/12/tx/8" }
```
Consistent, machine-readable, extensible.

## Authentication

- **OAuth 2.0 + JWT**: user-facing APIs, delegated access, stateless tokens.
- **API keys**: server-to-server, simple, rotate them, scope them.
- **mTLS**: internal service-to-service, strong mutual identity.

## API Gateway

Centralizes rate limiting, auth, routing, request/response transformation, observability. Options: **Kong, Envoy, AWS API Gateway**. Keep it thin  --  don't put business logic there.

## Anti-Patterns

- **Chatty APIs**: too many round trips for one screen → batch or use GraphQL.
- **God endpoints**: one endpoint doing everything with mega-payloads.
- **Breaking changes without versioning** → broken clients.
- Verbs in REST URLs (`/getUser`) instead of resources (`GET /users/1`).
- Leaking internal errors/stack traces to clients.
