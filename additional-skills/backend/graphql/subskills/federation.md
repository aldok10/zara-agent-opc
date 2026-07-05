# Federation

Apollo Federation 2 architecture. Subgraph design, entity resolution, router configuration, composition rules, progressive migration.

## Rules

1. Each entity has exactly one owning subgraph -- defines `@key` and resolves all fields it owns
2. Contributing subgraphs extend entities with `@key` reference and contribute additional fields
3. `@shareable` for fields multiple subgraphs can resolve (e.g., `User.name` in both profiles and auth)
4. `@override(from: "old-subgraph")` for migrating field ownership without breaking composition
5. `@inaccessible` to hide internal fields from the composed supergraph schema
6. `@provides` declares that a resolver returns fields from another entity (reduces round-trips)
7. `@requires` declares that a resolver needs fields from the entity before executing
8. `@external` marks fields that are resolved by another subgraph (used with `@requires`/`@provides`)
9. Router handles query planning -- subgraphs serve simple resolvers, router orchestrates
10. Entity reference resolvers (`__resolveReference`) must be lightweight -- batch via DataLoader

## Subgraph Design Principles

- Domain boundaries define subgraph boundaries (align with team ownership)
- Subgraphs are independently deployable -- composition check in CI before merge
- Keep subgraph count low (5-15 for most orgs) -- each adds latency and operational overhead
- Shared types (enums, scalars) belong in a "shared" subgraph or use `@shareable`
- Avoid circular entity references between subgraphs (causes query planning explosion)

## Entity Resolution

```graphql
# Owning subgraph (users service)
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

# Contributing subgraph (orders service)
type User @key(fields: "id") {
  id: ID!
  orders: [Order!]!
}

# Contributing subgraph (reviews service)
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
```

Reference resolver (must batch):
```typescript
const resolvers = {
  User: {
    __resolveReference(ref, { dataSources }) {
      return dataSources.users.load(ref.id); // DataLoader!
    }
  }
};
```

## Composition Errors (Common)

| Error | Cause | Fix |
|-------|-------|-----|
| `INVALID_FIELD_SHARING` | Same field in 2 subgraphs without `@shareable` | Add `@shareable` or move to one subgraph |
| `EXTERNAL_MISSING_ON_BASE` | `@external` field doesn't exist in owning subgraph | Check spelling, ensure owner defines it |
| `KEY_FIELDS_MISSING_EXTERNAL` | `@key` references field not in this subgraph | Add field with `@external` or adjust key |
| `OVERRIDE_SOURCE_MISSING` | `@override(from: "x")` but "x" doesn't define the field | Check subgraph name spelling |
| `REQUIRED_INPUT_FIELD_MISMATCH` | Input type differs between subgraphs | Inputs must be identical across subgraphs |

## Router Configuration (Apollo Router / Cosmo)

```yaml
# router.yaml (Apollo Router)
supergraph:
  listen: 0.0.0.0:4000

headers:
  all:
    request:
      - propagate:
          named: authorization
      - propagate:
          named: x-request-id

limits:
  max_depth: 10
  max_height: 200
  max_aliases: 30

telemetry:
  exporters:
    tracing:
      otlp:
        endpoint: http://otel-collector:4317
```

## Progressive Migration with @override

1. New subgraph defines the field with `@override(from: "old-subgraph")`
2. Compose and deploy router -- traffic now routes to new subgraph
3. Remove field from old subgraph once confirmed stable
4. Remove `@override` directive from new subgraph (now sole owner)

This enables zero-downtime field migration between teams.

## Verification

- [ ] `rover subgraph check` passes in CI for every PR
- [ ] `rover supergraph compose` succeeds with all subgraph schemas
- [ ] Entity reference resolvers use DataLoader (no N+1 on `__resolveReference`)
- [ ] No circular entity references between subgraphs
- [ ] Query plan inspection shows expected subgraph routing (`router --dev` mode)
- [ ] Subgraph health checks independent of router
- [ ] Each subgraph has integration tests runnable without router

## Anti-Patterns

- God subgraph (one subgraph owns everything -- defeats the purpose)
- Thin subgraphs (one entity per subgraph -- too many network hops)
- Bidirectional entity references (`User -> Order -> User` across subgraphs)
- Putting computed/aggregated fields in contributing subgraphs (use `@requires` instead)
- Shared mutable state between subgraphs (communicate via entities and events)
