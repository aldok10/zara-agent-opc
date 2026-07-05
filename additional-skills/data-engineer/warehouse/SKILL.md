---
name: warehouse
description: "Data warehousing: BigQuery, Snowflake, Redshift, dimensional modeling, materialized views, cost control"
---

# Data Warehouse Expert

Warehouse architecture and optimization. Cost-aware design for analytical workloads at scale.

## Scope

- Warehouse selection: BigQuery (serverless), Snowflake (multi-cluster), Redshift (provisioned/serverless)
- Dimensional modeling: star schema, snowflake schema, wide denormalized tables
- Materialized views, clustering keys, partitioning strategies
- Cost optimization: slot usage, credit consumption, scan reduction
- Data lifecycle: hot/warm/cold tiering, retention policies
- Multi-tenant warehouse isolation patterns
- Semi-structured data handling (VARIANT, STRUCT, JSON columns)

## First Action

1. Identify the warehouse platform and pricing model (on-demand vs reserved)
2. Check existing table structures, partitioning, and clustering
3. Review query history for top cost/duration queries
4. Identify data volumes and growth rate

## Constraints

1. Partition all fact tables by ingestion date or event timestamp; never leave large tables unpartitioned.
2. Cluster/sort keys must match the most common filter and join predicates; validate with query history.
3. Materialized views for queries running >4x daily with stable underlying data; refresh strategy must be explicit.
4. BigQuery: always use partition pruning (filter on partition column); queries scanning full partitions are cost bugs.
5. Snowflake: size warehouses based on query concurrency, not data size; auto-suspend after 1-5 minutes.
6. Redshift: use DISTSTYLE KEY for large join tables; EVEN for fact tables without dominant join key.
7. Cost alerts must exist before any production workload; no open-ended query budgets.
8. Use CTAS or INSERT OVERWRITE for large transformations; never row-by-row updates on columnar stores.
9. Semi-structured data must be flattened into typed columns for frequently queried fields.
10. Star schema for most analytical workloads; wide tables only when join cost is proven problematic.
11. Column data types must be minimal: INT32 over INT64, DATE over TIMESTAMP when time is not needed.
12. Query result caching must be understood per-platform; don't rely on it for SLA guarantees.
13. Separate compute for ETL and BI workloads to prevent resource contention.
14. Monitor bytes scanned per query (BQ), credits consumed (Snowflake), or node utilization (Redshift).

## DO NOT

- Run development queries against production datasets without cost limits
- Use SELECT * on columnar stores; it scans all columns regardless
- Create materialized views without a defined refresh schedule and staleness tolerance
- Mix transactional and analytical workloads in the same warehouse/dataset
- Use streaming inserts for batch-friendly workloads (10-100x cost difference)
- Partition on high-cardinality columns (>10k partitions creates metadata overhead)
- Ignore query queuing metrics; they indicate undersized compute
- Store normalized OLTP schemas in warehouses without transformation

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| SQL query optimization | `../sql` |
| dbt models, staging/marts | `../modeling` |
| Pipeline loading data into warehouse | `../pipeline` |
| Data freshness, SLA monitoring | `../quality` |
| Real-time ingestion to warehouse | `../streaming` |

## Verification

- Partition pruning confirmed in query execution plan (bytes scanned matches expected partition)
- Cost per query below defined budget threshold
- Materialized views refresh within staleness SLA
- No full-table scans on tables >1TB in query history
- Warehouse auto-suspend/resume working correctly (check credit burn during idle)
- Data freshness meets defined SLA per table/dataset

## Knowledge

- `knowledge/bigquery.md` -- slots, reservations, BI Engine, INFORMATION_SCHEMA views
- `knowledge/snowflake.md` -- warehouses, time travel, zero-copy clones, streams/tasks
- `knowledge/redshift.md` -- distribution styles, sort keys, Spectrum, AQUA
- `knowledge/dimensional-modeling.md` -- star schema, conformed dimensions, aggregate tables
- `knowledge/cost-optimization.md` -- per-platform cost levers, monitoring queries

## AI-Era Context (2026)

- AI-powered query optimizers (Snowflake Cortex, BQ Gemini) suggest clustering and materialization; validate suggestions
- Embedding columns stored in warehouses for vector similarity (Snowflake VECTOR, BQ vector search)
- Iceberg/Delta Lake as open table formats reduce warehouse lock-in; prefer external tables where possible
- Serverless warehouses (BQ, Snowflake Serverless, Redshift Serverless) eliminate sizing decisions but require cost vigilance
- LLM-generated BI queries via natural language interfaces increase scan volume; enforce per-user cost quotas
- Real-time materialized views (Snowflake Dynamic Tables, BQ continuous queries) blur batch/stream boundary

## Related Skills

- `data-engineer/sql` -- query optimization fundamentals
- `data-engineer/modeling` -- dbt and dimensional design
- `data-engineer/pipeline` -- loading patterns and scheduling
- `system-design` -- data platform architecture decisions
