# REST vs gRPC vs GraphQL

Pairwise decision guide for API communication styles.

## When to Choose REST

- Public-facing API (broad client compatibility)
- Simple CRUD operations
- Caching matters (HTTP cache, CDN)
- Team familiar with HTTP semantics
- Browser clients without build tooling
- API discoverability important (OpenAPI/Swagger)

## When to Choose gRPC

- Service-to-service communication (internal)
- High throughput, low latency required
- Streaming (server-push, bidirectional)
- Strong typing with code generation needed
- Polyglot services (shared .proto contracts)
- Mobile clients with bandwidth constraints

## When to Choose GraphQL

- Multiple clients need different data shapes
- Frontend-driven development (client decides fields)
- Aggregating data from multiple backends
- Rapid UI iteration without backend changes
- Reducing over-fetching on mobile

## Key Differentiators

| Dimension | REST | gRPC | GraphQL |
|-----------|------|------|---------|
| Protocol | HTTP/1.1+ | HTTP/2 | HTTP/1.1+ |
| Serialization | JSON (text) | Protobuf (binary) | JSON (text) |
| Performance | Good | Best (2-10x faster) | Good |
| Caching | Native (HTTP cache) | Hard | Hard (POST-only) |
| Streaming | Polling/SSE/WebSocket | Native bidirectional | Subscriptions |
| Browser support | Native | Needs proxy (grpc-web) | Native |
| Schema | OpenAPI (optional) | .proto (mandatory) | SDL (mandatory) |
| Learning curve | Low | Medium | Medium-High |
| Over-fetching | Common | No (typed messages) | Solved by design |
| N+1 problem | Client-side | No | Server-side risk |

## Common Mistakes

- GraphQL for simple CRUD with one client (over-engineering)
- REST for inter-service calls at scale (no streaming, JSON overhead)
- gRPC for public APIs (browser incompatibility)
- GraphQL without DataLoader (N+1 query explosion)
- REST without versioning strategy

## Decision Rule

Public API = REST. Internal high-perf services = gRPC. Multi-client data aggregation = GraphQL. When in doubt, start REST (lowest operational cost, widest compatibility). Migrate hot paths to gRPC when latency data proves need.
