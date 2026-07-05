---
type: tool
title: "Database Schema Review"
---

# Database Schema Review

## Purpose

Review database schemas for correctness, performance, and maintainability. Covers indexing strategy, normalization level, query patterns, and migration safety.

## When to Use

- Designing a new table or collection
- Reviewing index coverage for slow queries
- Evaluating normalization vs denormalization tradeoffs
- Planning schema migrations on large tables

## Prompt Template

```
CONTEXT:
- Database: [PostgreSQL | MySQL | MongoDB | DynamoDB | SQLite]
- Schema/DDL: [paste CREATE TABLE or equivalent]
- Primary access patterns: [list top 3-5 queries]
- Table size: [row count estimate, growth rate]
- Write pattern: [insert-heavy | update-heavy | append-only]
- Relationships: [1:1, 1:N, M:N with junction tables]

REVIEW AGAINST:
1. Normalization: appropriate level (3NF default, denormalize with justification)
2. Primary keys: natural vs surrogate, UUID vs serial, composite keys
3. Indexes: coverage for WHERE/JOIN/ORDER BY, composite index column order
4. Constraints: NOT NULL, CHECK, UNIQUE, FK with ON DELETE policy
5. Data types: appropriate width, avoid stringly-typed data, timestamp with timezone
6. Naming: consistent convention (snake_case), no reserved words
7. Query performance: N+1 potential, missing covering indexes, sequential scans
8. Migration safety: additive-only for zero-downtime, backfill strategy

IDENTIFY:
- Missing indexes for stated access patterns
- Over-indexing (write amplification)
- Implicit type coercion risks
- Lock contention during migration
- Orphaned data (missing FK or application-level cleanup)
```

## Output Format

```
## Schema Review: [table/collection name]

### Summary
[Verdict: well-structured / needs-indexes / redesign-needed]

### Issues
| # | Category | Severity | Description | Fix |
|---|----------|----------|-------------|-----|
| 1 | ...      | high/med/low | ... | ... |

### Index Recommendations
| Index | Columns | Type | Justification |
|-------|---------|------|---------------|
| ...   | ...     | btree/hash/gin | covers query X |

### Migration Notes
- [Safe migration steps for any schema changes]
```
