---
name: sql
description: "SQL engineering: window functions, CTEs, query optimization, pagination, indexing, PostgreSQL-first"
---

# SQL Expert

Advanced SQL engineering. Query design, optimization, and indexing with PostgreSQL as primary dialect.

## Scope

- Window functions, CTEs, recursive queries, lateral joins
- Query optimization via EXPLAIN ANALYZE
- Indexing strategies: B-tree, GIN, GiST, BRIN, partial, covering
- Pagination: keyset/cursor over OFFSET
- Parameterized queries and injection prevention
- Set-based thinking over procedural logic
- Query plan analysis and statistics tuning

## First Action

1. Identify the database engine and version (`SELECT version()`)
2. Read the existing schema, indexes, and constraints
3. Run EXPLAIN ANALYZE on the target query to establish a baseline
4. Check `pg_stat_user_indexes` for unused or redundant indexes

## Constraints

1. Use window functions over self-joins; they are clearer and faster in modern planners.
2. Use CTEs for readability and logical separation; mark performance-critical CTEs as `MATERIALIZED` or `NOT MATERIALIZED` explicitly.
3. Always run EXPLAIN ANALYZE before and after optimization; never guess at performance.
4. Use keyset pagination (WHERE id > $last_seen ORDER BY id LIMIT $n) over OFFSET for unbounded result sets.
5. Prefer partial indexes when queries filter on a constant predicate (e.g., `WHERE active = true`).
6. Use covering indexes (INCLUDE clause) to avoid heap lookups for frequent queries.
7. Never use `SELECT *` in application code; always specify columns explicitly.
8. Use proper data types: TIMESTAMPTZ for times, NUMERIC for money, UUID for identifiers, INET for IPs.
9. Parameterize all queries; never interpolate user input into SQL strings.
10. Index columns used in WHERE, JOIN ON, and ORDER BY; verify with EXPLAIN that the planner uses them.
11. Prefer EXISTS over IN for correlated subqueries with large outer sets.
12. Use `FILTER (WHERE ...)` clause on aggregates instead of CASE-based conditional aggregation.
13. Recursive CTEs must have a termination condition and a depth guard (UNION ALL with max depth).
14. Never add an index without checking write amplification impact on INSERT/UPDATE-heavy tables.
15. Use `pg_stat_statements` to identify top queries by total_exec_time before optimizing.

## DO NOT

- Use OFFSET for deep pagination (>1000 rows)
- Write correlated subqueries when a window function or lateral join works
- Add composite indexes without verifying column order matches leftmost prefix usage
- Use implicit type casts in WHERE clauses (kills index usage)
- Optimize queries without measuring first
- Use COUNT(*) for existence checks; use EXISTS instead
- Create indexes on low-cardinality columns without combining with other predicates
- Store denormalized aggregates without a refresh/invalidation strategy
- Use triggers for business logic that belongs in application code

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Schema design, normalization | `../modeling` |
| dbt SQL models, staging/mart layers | `../modeling` |
| Query performance on warehouse (BQ/Snowflake) | `../warehouse` |
| Data validation in SQL | `../quality` |
| Pipeline SQL transforms | `../pipeline` |

## Verification

- EXPLAIN ANALYZE shows index scan (not seq scan) for filtered queries on indexed columns
- Query cost reduced by >30% after optimization
- No implicit casts in filter predicates (check `::` usage in plan)
- Pagination returns consistent results under concurrent writes
- All user inputs reach the query via bind parameters ($1, $2)
- `pg_stat_user_indexes` confirms new indexes are being used after deployment

## Knowledge

- `knowledge/window-functions.md` -- ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD, frame clauses
- `knowledge/index-strategies.md` -- B-tree, GIN, GiST, BRIN, partial, covering, expression
- `knowledge/query-plans.md` -- reading EXPLAIN output, join strategies, cost model
- `knowledge/pagination.md` -- keyset vs offset, cursor encoding, composite sort keys

## AI-Era Context (2026)

- LLM-generated SQL often misuses window functions and produces unnecessary subqueries; always EXPLAIN
- pgvector similarity searches need IVFFlat or HNSW indexes; don't rely on sequential scans
- PostgreSQL 17 JSON_TABLE allows set-returning queries from JSON columns without custom functions
- AI query builders (text-to-SQL) produce syntactically valid but semantically wrong queries; human review required
- pg_stat_statements v1.11 tracks JIT compilation stats; useful for identifying JIT overhead

## Related Skills

- `database-expert` -- schema design, migrations, replication
- `data-engineer/warehouse` -- warehouse-specific SQL dialects
- `data-engineer/modeling` -- dimensional model SQL patterns
