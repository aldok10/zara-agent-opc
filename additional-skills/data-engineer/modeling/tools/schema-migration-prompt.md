---
type: tool
title: "Schema Migration Planning Prompt"
---

# Schema Migration Planning Prompt

Use this prompt to plan safe schema migrations with backward compatibility and rollback strategies.

## Prompt

```
You are a data engineer planning a schema migration for a production database. Design a migration plan that ensures zero data loss, backward compatibility, and safe rollback.

Input:
- Database: [PostgreSQL/MySQL/BigQuery/Snowflake/etc.]
- Current schema: [paste DDL or describe tables affected]
- Target schema: [desired end state]
- Traffic: [queries per second, peak hours, maintenance windows]
- Consumers: [services/reports that read this data]
- Deployment: [blue-green, rolling, maintenance window]
- Constraints: [max downtime tolerance, data volume]

Plan the migration covering:

1. CHANGE CLASSIFICATION
   - Backward compatible (safe): add nullable column, add table, add index
   - Requires coordination: rename column, change type with widening cast
   - Breaking: drop column, narrow type, change NOT NULL, remove table
   - For each change, classify and note which consumers are affected

2. MULTI-PHASE MIGRATION DESIGN
   Phase 1 - Expand:
   - Add new columns/tables alongside existing ones
   - Deploy code that writes to BOTH old and new schema
   - Backfill new columns from existing data

   Phase 2 - Migrate:
   - Deploy code that reads from new schema
   - Verify data consistency between old and new
   - Monitor for errors in consumers

   Phase 3 - Contract:
   - Remove old columns/tables only after all consumers migrated
   - Keep backup/archive of removed structures
   - Minimum soak time between phases: [recommendation based on traffic]

3. BACKWARD COMPATIBILITY CHECKS
   - Can old code read the new schema without errors?
   - Can new code read the old schema during rollback?
   - Are default values set for new NOT NULL columns?
   - Do views/materialized views need updating?
   - Are API contracts (GraphQL, REST) affected?

4. ROLLBACK STRATEGY
   - For each phase: what is the rollback step?
   - Data rollback: can backfilled data be reversed?
   - Code rollback: can previous deployment read current schema?
   - Point of no return: after which step is rollback destructive?
   - Rollback time estimate for each phase

5. EXECUTION PLAN
   - Pre-migration: backups, consumer notification, monitoring setup
   - Migration scripts: ordered DDL statements with idempotency guards
   - Validation queries: how to verify migration succeeded
   - Performance impact: will migration lock tables? For how long?
   - Monitoring: what metrics indicate migration problems?

Output format:
- Change inventory: table | column | change type | compatibility | risk
- Phase plan: phase | actions | duration | rollback step | point of no return
- Migration scripts (DDL) per phase
- Validation queries per phase
- Consumer communication checklist
- Rollback playbook (step-by-step for each phase)
- Timeline recommendation with buffer
```
