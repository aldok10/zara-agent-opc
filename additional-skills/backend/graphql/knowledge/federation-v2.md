# Federation 2 Directives & Composition

Apollo Federation 2 reference. Directives, entity resolution, composition rules, migration from v1, WunderGraph Cosmo compatibility.

## Federation 2 Directives

| Directive | Target | Purpose |
|-----------|--------|---------|
| `@key(fields: "id")` | Object type | Declares an entity with a unique key for cross-subgraph resolution |
| `@shareable` | Field / Object | Allows multiple subgraphs to resolve this field |
| `@override(from: "subgraph")` | Field | Migrates field ownership from one subgraph to another |
| `@inaccessible` | Field / Type | Hides from the public API (internal subgraph communication only) |
| `@external` | Field | Field is resolved by another subgraph (used with @requires/@provides) |
| `@requires(fields: "price")` | Field | Resolver needs these fields from the entity before executing |
| `@provides(fields: "name")` | Field | This resolver returns additional entity fields (optimization) |
| `@tag(name: "internal")` | Any | Metadata for schema governance (contract filtering) |
| `@composeDirective` | Schema | Includes custom directives in composition |
| `@interfaceObject` | Object | Contributes fields to an interface defined in another subgraph |

## Schema Header (Required for Federation 2)

```graphql
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.5",
        import: ["@key", "@shareable", "@override", "@inaccessible",
                 "@external", "@requires", "@provides", "@tag",
                 "@interfaceObject", "@composeDirective"])
```

## Entity Resolution Flow

1. Router receives query spanning multiple subgraphs
2. Router creates query plan: which subgraph resolves which fields
3. Router calls owning subgraph for entity root fields
4. Router passes entity representation (`{ __typename, ...keyFields }`) to contributing subgraphs
5. Contributing subgraph's `__resolveReference` receives the representation, resolves additional fields
6. Router merges results from all subgraphs into single response

## @override for Progressive Migration

Scenario: moving `User.email` from `accounts` subgraph to `notifications` subgraph.

Step 1 -- New subgraph claims field:
```graphql
# notifications subgraph
type User @key(fields: "id") {
  id: ID!
  email: String! @override(from: "accounts")
}
```

Step 2 -- Deploy. Router now routes `User.email` queries to notifications subgraph.

Step 3 -- Remove field from accounts subgraph (after monitoring confirms zero traffic).

Step 4 -- Remove `@override` from notifications (now sole owner).

Progressive override (percentage-based, Apollo Router 2025+):
```graphql
email: String! @override(from: "accounts", percent: 50)
```

## Composition Rules

| Rule | Description |
|------|-------------|
| Entity key must be resolvable | Owning subgraph must resolve all `@key` fields |
| Shared fields must match types | Same field in multiple subgraphs must have identical type |
| Input types must be identical | If two subgraphs define same input type, all fields must match |
| Enums are merged | Values across subgraphs are unioned (careful with exhaustive matching) |
| Scalars must be compatible | Custom scalars shared across subgraphs must behave identically |
| No circular @requires | Field A requires B which requires A = composition error |
| @inaccessible hides completely | Not available in supergraph schema (only for inter-subgraph use) |

## WunderGraph Cosmo Compatibility

Cosmo implements Federation 2 spec. Key differences:
- Open-source router (no Apollo license)
- CLI: `wgc` instead of `rover`
- Composition: `wgc compose` vs `rover supergraph compose`
- Schema registry: Cosmo Studio (self-hostable)
- Supports same directives: `@key`, `@shareable`, `@override`, `@external`, `@requires`, `@provides`
- Additional feature: subscription federation (not available in Apollo Router)

## Federation 1 → 2 Migration

1. Add `extend schema @link(...)` header with Federation 2 imports
2. Replace `extend type Entity` with `type Entity @key(...)` (entities no longer need `extend`)
3. Add `@shareable` to fields that multiple subgraphs resolve (v1 allowed implicitly)
4. Test composition with `rover supergraph compose --federation-version=2`
5. Deploy incrementally (router supports mixed v1/v2 subgraphs during transition)
