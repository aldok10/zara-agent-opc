# SQL vs NoSQL

Pairwise decision guide for choosing between relational databases and NoSQL stores.

## When to Choose SQL (Relational)

- Complex queries with joins across entities
- Strong consistency required (financial, inventory)
- Schema is well-known and stable
- Relationships between entities are central
- Reporting and ad-hoc analytics needed
- ACID transactions across multiple tables
- Team expertise is SQL-heavy

## When to Choose NoSQL

- Schema varies per document (semi-structured data)
- Horizontal scaling is primary concern
- Read-heavy with simple access patterns (key lookup)
- Event/time-series data (append-mostly)
- Rapid iteration on data model (schema-less)
- Geographic distribution needed (multi-region)
- Specific data model fits naturally (graph, document, columnar)

## Key Differentiators

| Dimension | SQL | NoSQL |
|-----------|-----|-------|
| Query flexibility | High (arbitrary JOINs) | Low (design around access patterns) |
| Schema enforcement | Strict (migrations) | Flexible (schema-on-read) |
| Consistency | Strong (ACID) | Configurable (eventual to strong) |
| Scaling | Vertical first, read replicas | Horizontal (sharding built-in) |
| Joins | Native, optimized | Application-level or denormalized |
| Transactions | Multi-table ACID | Often single-document only |
| Maturity | 40+ years of tooling | Varies by system |

## NoSQL Subtypes

| Type | Use Case | Examples |
|------|----------|---------|
| Document | Variable schema, nested data | MongoDB, CouchDB |
| Key-Value | Cache, session, simple lookups | Redis, DynamoDB |
| Wide-Column | Time-series, IoT, analytics | Cassandra, ScyllaDB |
| Graph | Relationships are the query | Neo4j, Neptune |

## Common Mistakes

- NoSQL because "SQL doesn't scale" (PostgreSQL handles most workloads fine)
- SQL for write-heavy time-series (wide-column or specialized TSDBs win)
- Choosing MongoDB then fighting lack of joins for relational data
- Not considering operational complexity (managed vs self-hosted)

## Decision Rule

Default to PostgreSQL. Switch to NoSQL only when: (1) access patterns proven simple and read-heavy, (2) horizontal scaling data demonstrates need, or (3) data model is genuinely non-relational (graph, time-series, documents with no cross-references).
