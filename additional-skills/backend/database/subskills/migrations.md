---
type: subskill
title: "Migrations"
---

# Migrations

Zero-downtime DDL, expand-contract pattern, and tooling for safe schema evolution.

## When to Use

- Adding/removing/modifying columns in production
- Choosing migration tooling (Flyway, Alembic, golang-migrate, Atlas)
- Planning multi-step schema changes without downtime
- Handling large table alterations (>10M rows)
- Managing migration state and rollback strategies
- Coordinating schema changes with application deployments

## Rules

1. Every migration must be backward-compatible with the current running application code; deploy code first, migrate second (or use expand-contract).
2. Never rename or drop a column in a single release; use 3-phase: add new -> migrate data -> remove old (across separate deploys).
3. `NOT NULL` constraints must be added in steps: add column nullable -> backfill -> add constraint with `NOT VALID` -> validate separately.
4. Migrations must be idempotent: use `IF NOT EXISTS`, `IF EXISTS`, check state before acting.
5. Lock-safe DDL: `CREATE INDEX CONCURRENTLY` (PostgreSQL), `ALGORITHM=INPLACE LOCK=NONE` (MySQL), or gh-ost for large tables.
6. Never run data migrations (UPDATE/INSERT) in the same transaction as DDL; separate structural and data migrations.
7. Migration files must be immutable once applied to any environment; never edit a deployed migration.
8. Use advisory locks or migration tool locking to prevent concurrent migration execution.
9. Every migration must have a rollback script or documented manual rollback procedure.
10. Test migrations against production-size data in staging; a migration fast on 1000 rows may lock for hours on 100M.

## Expand-Contract Pattern

```
Phase 1: EXPAND (backward compatible)
  - Add new column/table
  - Deploy code that writes to both old and new
  - Backfill historical data in batches

Phase 2: MIGRATE (switch reads)
  - Deploy code that reads from new, writes to both
  - Verify data consistency

Phase 3: CONTRACT (cleanup)
  - Deploy code that only uses new
  - Drop old column/table (separate deploy)
```

## Tooling Comparison

| Tool | Language | Features |
|------|----------|----------|
| Atlas (Ariga) | Any | Declarative, drift detection, lint |
| Flyway | JVM | Versioned SQL, Java callbacks |
| Alembic | Python | SQLAlchemy integration, auto-generate |
| golang-migrate | Go | Simple, driver-based, CLI |
| Prisma Migrate | TypeScript | Schema-first, shadow DB |
| Liquibase | JVM | XML/YAML/SQL, rollback support |
| gh-ost | Any (MySQL) | Triggerless online DDL |

## Patterns

### Safe Column Addition (PostgreSQL)
```sql
-- Migration 001: Add column (instant, no lock)
ALTER TABLE orders ADD COLUMN shipping_method TEXT;

-- Migration 002: Backfill in batches (separate deploy)
UPDATE orders SET shipping_method = 'standard'
WHERE shipping_method IS NULL AND id BETWEEN $1 AND $2;

-- Migration 003: Add constraint (after backfill complete)
ALTER TABLE orders ALTER COLUMN shipping_method SET DEFAULT 'standard';
ALTER TABLE orders ADD CONSTRAINT orders_shipping_not_null
  CHECK (shipping_method IS NOT NULL) NOT VALID;
-- Validate separately (scans but doesn't lock writes)
ALTER TABLE orders VALIDATE CONSTRAINT orders_shipping_not_null;
```

### Safe Column Rename (3 deploys)
```
Deploy 1: Add new column, dual-write in app
  ALTER TABLE users ADD COLUMN full_name TEXT;
  -- App writes to both `name` and `full_name`

Deploy 2: Backfill, switch reads to new column
  UPDATE users SET full_name = name WHERE full_name IS NULL;  -- batched
  -- App reads from `full_name`, still writes both

Deploy 3: Drop old column
  ALTER TABLE users DROP COLUMN name;
  -- App only uses `full_name`
```

### Batched Data Migration
```sql
-- Process in chunks to avoid long transactions
DO $$
DECLARE
  batch_size INT := 10000;
  affected INT := 1;
BEGIN
  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM orders
      WHERE status_v2 IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE orders SET status_v2 = compute_new_status(status)
    FROM batch WHERE orders.id = batch.id;
    
    GET DIAGNOSTICS affected = ROW_COUNT;
    COMMIT;
    PERFORM pg_sleep(0.1);  -- backpressure
  END LOOP;
END $$;
```

## Anti-Patterns

- Running `ALTER TABLE ... ADD COLUMN ... DEFAULT x` on PG <11 (rewrites entire table; PG 11+ is instant)
- Wrapping `CREATE INDEX CONCURRENTLY` in a transaction (fails silently)
- Deploying code that expects new column before migration runs
- Using `LOCK TABLE` explicitly in migration scripts
- Backfilling millions of rows in a single UPDATE statement
- Assuming ORM auto-migrations are safe for production

## Verification

- Test migration on staging with production-volume data
- Measure lock duration: `SELECT * FROM pg_locks WHERE NOT granted`
- Verify rollback script works: apply, rollback, re-apply
- Check migration tool's lock timeout settings prevent indefinite waits
- After migration: verify query plans haven't changed (indexes still used)
- Monitor replication lag during migration execution
