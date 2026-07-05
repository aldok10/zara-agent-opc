-- Keyset Pagination (Cursor-Based)
-- Avoids OFFSET performance degradation on large tables.

-- Basic pattern: single column sort
-- First page
SELECT id, title, created_at
FROM articles
WHERE published = true
ORDER BY id ASC
LIMIT 20;

-- Next page (pass last seen id as cursor)
SELECT id, title, created_at
FROM articles
WHERE published = true
  AND id > :last_seen_id
ORDER BY id ASC
LIMIT 20;

-- Composite sort key: created_at DESC, id DESC (for chronological feeds)
-- First page
SELECT id, title, created_at
FROM articles
WHERE published = true
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page using composite cursor
SELECT id, title, created_at
FROM articles
WHERE published = true
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Index to support the above (critical for performance)
CREATE INDEX idx_articles_cursor ON articles (created_at DESC, id DESC)
WHERE published = true;

-- Bidirectional navigation (prev/next)
-- Next page
SELECT * FROM (
    SELECT id, title, created_at
    FROM articles
    WHERE (created_at, id) < (:cursor_created_at, :cursor_id)
    ORDER BY created_at DESC, id DESC
    LIMIT 20
) sub
ORDER BY created_at DESC, id DESC;

-- Previous page (reverse direction)
SELECT * FROM (
    SELECT id, title, created_at
    FROM articles
    WHERE (created_at, id) > (:cursor_created_at, :cursor_id)
    ORDER BY created_at ASC, id ASC
    LIMIT 20
) sub
ORDER BY created_at DESC, id DESC;

-- Encoding cursors for API responses
-- Cursor = base64(json({"created_at": "2026-01-15T10:30:00Z", "id": 12345}))
-- Decode on server, extract values, use in WHERE clause

-- With total count (expensive -- cache separately)
WITH page AS (
    SELECT id, title, created_at
    FROM articles
    WHERE published = true
      AND (created_at, id) < (:last_created_at, :last_id)
    ORDER BY created_at DESC, id DESC
    LIMIT 20
)
SELECT
    (SELECT COUNT(*) FROM articles WHERE published = true) AS total_count,
    json_agg(page.*) AS items
FROM page;

-- Keyset with nullable sort column
-- NULLs sort last in DESC -- handle with COALESCE or explicit NULL ordering
SELECT id, title, priority, created_at
FROM tasks
WHERE status = 'open'
  AND (
    (priority IS NULL AND :last_priority IS NULL AND id < :last_id)
    OR (priority IS NULL AND :last_priority IS NOT NULL)
    OR (priority < :last_priority)
    OR (priority = :last_priority AND id < :last_id)
  )
ORDER BY priority DESC NULLS LAST, id DESC
LIMIT 20;

-- Seek method for multi-tenant (partition by tenant first)
SELECT id, title, created_at
FROM articles
WHERE tenant_id = :tenant_id
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Supporting index
CREATE INDEX idx_articles_tenant_cursor
ON articles (tenant_id, created_at DESC, id DESC);

-- Detecting has_more (fetch n+1, return n)
SELECT id, title, created_at
FROM articles
WHERE published = true
  AND (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC
LIMIT 21; -- fetch 21, if 21 rows returned -> has_more = true, return first 20
