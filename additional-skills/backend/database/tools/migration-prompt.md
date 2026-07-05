---
type: tool
title: "Database Migration Planning"
---

# Database Migration Planning

## Purpose

Plan zero-downtime database migrations with rollback strategy. Covers schema changes, data transformations, and deployment sequencing to prevent outages during production migrations.

## When to Use

- Adding/removing/renaming columns on high-traffic tables
- Changing column types or constraints
- Splitting or merging tables
- Large-scale data backfill or transformation
- Database engine or version upgrade
- Sharding or partitioning existing data

## Prompt Template

```
CONTEXT:
- Database: [PostgreSQL | MySQL | MongoDB | DynamoDB | SQL Server]
- Table/collection: [name, approximate row count]
- Current schema: [relevant columns, indexes, constraints]
- Desired change: [specific DDL or structural change]
- Traffic pattern: [read/write ratio, peak QPS]
- Deployment strategy: [rolling | blue-green | maintenance window]
- Migration tool: [Flyway | Liquibase | Alembic | knex | Prisma | raw SQL]
- Rollback requirement: [instant | minutes | hours acceptable]

PLAN PHASES:
1. Pre-migration
   - Backward-compatible intermediate state
   - Dual-write setup if needed
   - Backfill strategy for existing data
   - Index creation (CONCURRENTLY where supported)

2. Migration execution
   - DDL sequence (expand, then contract)
   - Batch size for data transforms
   - Lock implications (table locks, row locks)
   - Online DDL tools (pt-osc, gh-ost, pg_repack)

3. Verification
   - Data integrity checks (row counts, checksums)
   - Application compatibility at each phase
   - Performance validation (query plans, latency)

4. Rollback plan
   - Reverse migration script
   - Data preservation during rollback
   - Point of no return identification

5. Cleanup
   - Remove old columns/tables (separate deploy)
   - Drop temporary structures
   - Update ORM/query layer

CONSTRAINTS:
- Maximum acceptable downtime: [zero | seconds | minutes]
- Maximum lock duration: [milliseconds]
- Data loss tolerance: [none | bounded]
```

## Output Format

```
## Migration Plan: [description]

### Change Summary
[What changes from current to target state]

### Phase Sequence
| Phase | Action | Reversible | Risk |
|-------|--------|-----------|------|
| 1 | ... | yes/no | ... |

### Migration Scripts
[Key SQL/commands for each phase]

### Rollback Procedure
1. [Step with expected outcome]

### Verification Checks
- [ ] [Specific check with expected result]

### Timeline Estimate
- Preparation: [duration]
- Execution: [duration per phase]
- Monitoring: [post-migration observation period]

### Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ... | ... | ... | ... |
```
