# References

## GraphQL Specification (6 refs)

- **GraphQL Specification** -- https://spec.graphql.org/October2021/ -- Official language specification
- **GraphQL Best Practices** -- https://graphql.org/learn/best-practices/ -- Official design guidance
- **GraphQL over HTTP** -- https://graphql.github.io/graphql-over-http/ -- Transport specification
- **Relay Specification** -- https://relay.dev/docs/guides/graphql-server-specification/ -- Relay server requirements
- **Global Object Identification** -- https://graphql.org/learn/global-object-identification/ -- Node interface pattern
- **Cursor-Based Pagination** -- https://relay.dev/graphql/connections.htm -- Connection specification

## Federation (7 refs)

- **Apollo Federation** -- https://www.apollographql.com/docs/federation/ -- Supergraph architecture
- **Federation 2 Spec** -- https://www.apollographql.com/docs/federation/federation-spec/ -- Subgraph composition rules
- **Apollo Router** -- https://www.apollographql.com/docs/router/ -- High-performance graph router
- **Federated Schema Design** -- https://www.apollographql.com/docs/federation/entities/ -- Entity and reference resolution
- **GraphQL Mesh** -- https://the-guild.dev/graphql/mesh/docs -- Unified API gateway from any source
- **WunderGraph** -- https://docs.wundergraph.com/ -- API composition and gateway
- **Hive** -- https://the-guild.dev/graphql/hive/docs -- Schema registry and observability

## DataLoader & Performance (6 refs)

- **DataLoader** -- https://github.com/graphql/dataloader -- Batching and caching utility
- **DataLoader Pattern** -- https://www.apollographql.com/blog/backend/data-sources/how-to-use-dataloader/ -- N+1 prevention guide
- **Query Complexity Analysis** -- https://www.apollographql.com/blog/graphql/security/securing-your-graphql-api-from-malicious-queries/ -- Cost analysis
- **graphql-query-complexity** -- https://github.com/slicknode/graphql-query-complexity -- Complexity limiting library
- **Automatic Persisted Queries** -- https://www.apollographql.com/docs/apollo-server/performance/apq/ -- Bandwidth optimization
- **@defer and @stream** -- https://github.com/graphql/graphql-spec/blob/main/rfcs/DeferStream.md -- Incremental delivery

## Server Implementations (6 refs)

- **Apollo Server** -- https://www.apollographql.com/docs/apollo-server/ -- Production Node.js server
- **GraphQL Yoga** -- https://the-guild.dev/graphql/yoga-server/docs -- Lightweight GraphQL server
- **Strawberry (Python)** -- https://strawberry.rocks/docs -- Code-first Python GraphQL
- **gqlgen (Go)** -- https://gqlgen.com/getting-started/ -- Schema-first Go server
- **Juniper (Rust)** -- https://graphql-rust.github.io/juniper/ -- Rust GraphQL library
- **HotChocolate (.NET)** -- https://chillicream.com/docs/hotchocolate -- .NET GraphQL platform

## Security (5 refs)

- **GraphQL Security** -- https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html -- OWASP GraphQL checklist
- **Depth Limiting** -- https://the-guild.dev/graphql/yoga-server/docs/features/security/max-depth -- Query depth protection
- **Rate Limiting** -- https://www.apollographql.com/blog/graphql/security/securing-your-graphql-api-from-malicious-queries/ -- Cost-based rate limits
- **Field-Level Authorization** -- https://www.apollographql.com/docs/apollo-server/security/authentication/ -- Auth in resolvers
- **Introspection Control** -- https://www.apollographql.com/blog/graphql/security/why-you-should-disable-graphql-introspection-in-production/ -- Production hardening

## Schema Design (5 refs)

- **Schema Design Best Practices** -- https://www.apollographql.com/docs/technotes/TN0002-schema-naming-conventions -- Naming and structure
- **Nullability** -- https://graphql.org/learn/best-practices/#nullability -- When to use non-null
- **Input Types** -- https://graphql.org/learn/schema/#input-types -- Mutation input patterns
- **Union and Interface** -- https://graphql.org/learn/schema/#union-types -- Polymorphic types
- **Custom Scalars** -- https://the-guild.dev/graphql/scalars/docs -- Extended scalar types

## Client Libraries (4 refs)

- **Apollo Client** -- https://www.apollographql.com/docs/react/ -- React GraphQL client
- **urql** -- https://formidable.com/open-source/urql/docs/ -- Lightweight GraphQL client
- **Relay** -- https://relay.dev/docs/ -- Production GraphQL client by Meta
- **graphql-request** -- https://github.com/jasonkuhrt/graphql-request -- Minimal GraphQL client

## Tooling (5 refs)

- **GraphQL Code Generator** -- https://the-guild.dev/graphql/codegen/docs/getting-started -- Type generation from schema
- **GraphiQL** -- https://github.com/graphql/graphiql -- In-browser GraphQL IDE
- **Rover CLI** -- https://www.apollographql.com/docs/rover/ -- Apollo schema management CLI
- **GraphQL Inspector** -- https://the-guild.dev/graphql/inspector/docs -- Schema change detection
- **Envelop** -- https://the-guild.dev/graphql/envelop/docs -- Plugin system for GraphQL
