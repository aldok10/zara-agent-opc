-- Zero-Downtime Migration: Expand-Contract Pattern
-- Example: Renaming `name` to `full_name` in users table without downtime

-- ============================================================
-- PHASE 1: EXPAND (Deploy with migration, code writes to both)
-- ============================================================

-- Step 1.1: Add new column (instant in PG 11+, no table rewrite)
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Step 1.2: Create trigger to keep columns in sync during transition
CREATE OR REPLACE FUNCTION sync_user_name() RETURNS trigger AS $$
BEGIN
    IF NEW.full_name IS NULL AND NEW.name IS NOT NULL THEN
        NEW.full_name := NEW.name;
    ELSIF NEW.name IS NULL AND NEW.full_name IS NOT NULL THEN
        NEW.name := NEW.full_name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_user_name
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION sync_user_name();

-- Step 1.3: Backfill existing data in batches
-- Run this as a background job, not in the migration transaction
DO $$
DECLARE
    batch_size INT := 5000;
    total_updated INT := 0;
    rows_affected INT := 1;
BEGIN
    WHILE rows_affected > 0 LOOP
        UPDATE users
        SET full_name = name
        WHERE full_name IS NULL
          AND id IN (
            SELECT id FROM users
            WHERE full_name IS NULL
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
          );

        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        total_updated := total_updated + rows_affected;
        RAISE NOTICE 'Updated % rows (total: %)', rows_affected, total_updated;
        
        -- Throttle to avoid overwhelming replication
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Step 1.4: Add index on new column (concurrently, no lock)
CREATE INDEX CONCURRENTLY idx_users_full_name ON users (full_name);

-- ============================================================
-- PHASE 2: MIGRATE (Deploy code that reads from full_name)
-- ============================================================
-- Application code now:
--   - Reads from `full_name`
--   - Writes to both `full_name` and `name`
--   - Monitor for any issues for 24-48h

-- ============================================================
-- PHASE 3: CONTRACT (Cleanup after stable deployment)
-- ============================================================

-- Step 3.1: Add NOT NULL constraint (without blocking writes)
ALTER TABLE users ADD CONSTRAINT users_full_name_not_null
    CHECK (full_name IS NOT NULL) NOT VALID;

-- Validate separately (scans but doesn't block writes)
ALTER TABLE users VALIDATE CONSTRAINT users_full_name_not_null;

-- Step 3.2: Remove sync trigger (code no longer uses `name`)
DROP TRIGGER trg_sync_user_name ON users;
DROP FUNCTION sync_user_name();

-- Step 3.3: Drop old column (only after ALL services deployed with new code)
ALTER TABLE users DROP COLUMN name;

-- Step 3.4: Drop old index if it existed
DROP INDEX CONCURRENTLY IF EXISTS idx_users_name;

-- ============================================================
-- ROLLBACK PLAN (if issues detected at any phase)
-- ============================================================

-- Phase 1 rollback: drop new column, trigger, index
-- DROP TRIGGER IF EXISTS trg_sync_user_name ON users;
-- DROP FUNCTION IF EXISTS sync_user_name();
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_full_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS full_name;

-- Phase 2 rollback: redeploy old code (reads from `name`)
-- Phase 3 rollback: not possible after DROP COLUMN; this is why we wait
