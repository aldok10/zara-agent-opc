---
type: tool
title: "SQL Query Performance Analysis Prompt"
---

# SQL Query Performance Analysis Prompt

Use this prompt to analyze slow SQL queries and produce actionable optimization recommendations.

## Prompt

```
You are a database performance engineer analyzing a slow SQL query. Provide specific, actionable optimizations based on the execution plan and schema.

Input:
- Query: [paste the SQL query]
- EXPLAIN output: [paste execution plan - EXPLAIN ANALYZE preferred]
- Database: [PostgreSQL/MySQL/BigQuery/Snowflake/Redshift]
- Table sizes: [row counts for tables involved]
- Current indexes: [list existing indexes on relevant tables]
- Execution time: [current duration]
- Target time: [desired duration]
- Frequency: [how often this query runs]

Analyze against these dimensions:

1. EXECUTION PLAN ANALYSIS
   - Identify the most expensive node (highest cost/actual time)
   - Scan types: sequential scans on large tables? (should be index scan)
   - Join methods: nested loops on large tables? (should be hash/merge join)
   - Sort operations: are they necessary? Can an index provide order?
   - Filter vs Index Cond: are filters applied after scan instead of during?
   - Row estimates vs actuals: large discrepancies indicate stale statistics
   - Memory usage: disk spills in sorts or hash operations?

2. INDEX RECOMMENDATIONS
   - Missing indexes: which WHERE/JOIN/ORDER BY columns lack indexes?
   - Composite indexes: which multi-column queries benefit from compound keys?
   - Index order: match the query's filter selectivity (most selective first)
   - Covering indexes: can INCLUDE columns avoid table lookups?
   - Partial indexes: can a WHERE clause on the index reduce size?
   - Unused indexes: are existing indexes actually being used?

3. QUERY REWRITE OPPORTUNITIES
   - Subquery to JOIN conversion (or vice versa based on plan)
   - EXISTS vs IN vs JOIN for semi-joins
   - CTE materialization issues (fence optimization in PostgreSQL)
   - UNION ALL vs UNION (avoid unnecessary sort+dedup)
   - Window functions vs self-joins
   - Predicate pushdown: move filters earlier in the query
   - LIMIT pushdown: can the engine stop early?

4. STATISTICS & CONFIGURATION
   - Are table statistics up to date? (ANALYZE/VACUUM timing)
   - work_mem / sort_buffer_size adequate for this query?
   - Are there parameter sniffing issues (plan cached for different data)?
   - Partitioning: is partition pruning effective?
   - Parallelism: is the query using available parallel workers?

5. SCHEMA CONSIDERATIONS
   - Denormalization: would a materialized view help?
   - Partitioning: would table partitioning improve this access pattern?
   - Data types: are comparison columns the same type? (implicit casts kill indexes)
   - Column order in composite indexes matches query pattern?

Output format for each recommendation:
- Finding: what the plan reveals
- Impact: estimated improvement (2x, 10x, etc.) or time saved
- Action: specific SQL (CREATE INDEX, rewritten query, configuration change)
- Risk: any downside (write overhead for indexes, maintenance cost)
- Effort: minutes/hours to implement

Summary:
- Top 3 changes ranked by impact-to-effort ratio
- Expected final execution time after all changes
- Monitoring: how to verify improvement (pg_stat_statements, slow query log)
```
