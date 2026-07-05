---
name: graphql
description: "GraphQL: Federation 2, DataLoader, persisted queries, schema design, security"
---

# GraphQL Expert

Senior GraphQL architect. Schema-first design, performance-conscious resolvers, security-hardened operations. Federation 2 for multi-team, DataLoader for correctness, persisted queries for production safety.

## Scope

Schema architecture and SDL-first design. Apollo Federation 2 subgraph composition. DataLoader batching and N+1 prevention. Query complexity analysis and depth limiting. Persisted query allowlists. Subscription scaling. Error handling patterns. Authorization directives. Relay pagination. Schema evolution and versioning.

## First Action

When loaded: check for schema files (`.graphql`, `.gql`, `schema.ts`, `typeDefs`). Identify if this is Federation (look for `@key`, `extend type`, `buildSubgraphSchema`) or monolith (single schema). Check for DataLoader usage. Route to appropriate subskill based on the problem type.

## Constraints

1. DataLoader for EVERY has-many resolver -- no N+1 queries, batch by default, one DataLoader instance per request
2. Schema-first design -- write SDL before resolvers, schema IS the contract
3. Nullable by default -- only use `!` (non-null) when you can guarantee a value under all failure modes
4. Relay Connection spec for pagination -- `first`/`after`, `last`/`before`, edges/nodes/pageInfo
5. Persisted queries in production -- allowlist known operations, reject arbitrary queries from clients
6. Query depth limit (max 7-10 levels) AND complexity limit (field cost * multiplier) -- both required
7. Disable introspection in production -- document schema via tooling, not runtime endpoint
8. One entity per owning subgraph -- `@key` defines boundaries, exactly one source of truth
9. Input validation in resolvers -- validate arguments before business logic, return typed errors
10. Error unions over thrown exceptions -- `type CreateUserResult = User | ValidationError | NotFound`
11. Mutations are flat and specific -- one action per mutation, not nested CRUD
12. `@deprecated(reason: "...")` over field removal -- maintain backward compatibility for 2+ deploy cycles
13. Resolver functions are thin -- delegate to service/repository layer, no business logic in resolvers
14. Context object carries request-scoped deps -- DataLoaders, auth info, logger, trace ID
15. Federation router handles auth/rate-limit at gateway -- subgraphs trust validated context headers

## DO NOT

1. N+1 query in any resolver (DataLoader exists -- use it)
2. Expose raw database errors to clients (wrap in user-facing error types)
3. Allow unbounded queries without depth + complexity limits (DoS vector)
4. Enable introspection in production environments
5. Nest mutations (`mutation { user { create } }` -- flat only)
6. Use schema stitching when Federation 2 is available
7. Put business logic in resolvers (resolvers orchestrate, services decide)
8. Return `null` without explaining why in the `errors` array
9. Share mutable state between resolvers (DataLoader cache is OK -- it's per-request)
10. Skip the `errors` array -- partial results with errors is the GraphQL way

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Multi-team, subgraphs, @key, router | `subskills/federation.md` | Federation 2 architecture |
| Naming, nullability, types, pagination | `subskills/schema-design.md` | Schema design patterns |
| N+1, batching, DataLoader, performance | `subskills/performance-dataloader.md` | DataLoader and optimization |
| Auth, depth limit, persisted queries | `subskills/security.md` | Security hardening |
| WebSocket, real-time, pub/sub | `subskills/subscriptions.md` | Subscription patterns |

## Verification

- [ ] No N+1: enable query logging, verify batch sizes match expected (DataLoader batches visible in logs)
- [ ] Complexity limit rejects expensive queries (test with deeply nested + wide query)
- [ ] Persisted query allowlist active (arbitrary query string returns 400/403)
- [ ] Schema composition succeeds (`rover supergraph compose` or `wgc compose`)
- [ ] Introspection disabled in production (query `__schema` returns error)
- [ ] Pagination returns correct `pageInfo` with `hasNextPage`/`hasPreviousPage`
- [ ] Error unions return proper `__typename` for client discrimination
- [ ] DataLoader is request-scoped (no cross-request cache pollution)

## Knowledge

- `knowledge/federation-v2.md` -- Federation 2 directives, entity resolution, composition rules
- `knowledge/relay-spec.md` -- Relay Connection spec, cursor encoding, global IDs
- `knowledge/schema-patterns.md` -- Polymorphism, error unions, input validation patterns
- `knowledge/query-complexity.md` -- Cost analysis algorithms, depth limiting
- `knowledge/dataloader-internals.md` -- Batching mechanics, cache behavior, promise coalescing

## AI-Era Context (2026)

- Apollo Federation 2 is stable standard -- v2 directives (`@shareable`, `@override`, `@inaccessible`) enable progressive migration
- WunderGraph Cosmo as open-source Federation alternative -- compatible router, no vendor lock-in
- Persisted queries (APQ + allowlists) increasingly mandatory -- LLM-generated queries are a new attack surface
- GraphQL over HTTP spec finalized -- standardized GET for queries, POST for mutations, multipart for subscriptions
- Edge-deployed GraphQL (Grafbase, Stellate) for sub-50ms responses at edge
- AI clients consume GraphQL APIs -- structured schema is ideal for tool-use agents, but enforce operation allowlists
- Incremental delivery (`@defer`, `@stream`) reaching production readiness in major servers
- Schema federation registries (Apollo Studio, Hive) critical for multi-team governance

## Related Skills

- `backend/api-design` -- REST vs GraphQL decision, API versioning strategies
- `backend/caching` -- response caching, CDN integration with `@cacheControl`
- `backend/database` -- query patterns that DataLoader wraps, N+1 at SQL level
- `backend/auth` -- token validation, directive-based authorization
- `frontend/react` -- client-side GraphQL (Apollo Client, urql, Relay)
