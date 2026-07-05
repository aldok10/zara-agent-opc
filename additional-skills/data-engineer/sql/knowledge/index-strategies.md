# Index Strategies

PostgreSQL index types, selection criteria, and design patterns for query optimization.

## B-tree (Default)

The workhorse index. Handles equality, range, sorting, and prefix matching.

```sql
CREATE INDEX idx_orders_created ON orders (created_at);
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
```

**When**: equality (=), range (<, >, BETWEEN), ORDER BY, IS NULL/IS NOT NULL
**Column order**: most selective first for equality; range columns last in composite indexes
**Limitation**: useless for pattern matching without left-anchor, array containment, full-text

## GIN (Generalized Inverted Index)

Indexes composite values -- arrays, JSONB, full-text vectors, trigrams.

```sql
CREATE INDEX idx_tags ON articles USING gin (tags);
CREATE INDEX idx_doc_search ON documents USING gin (to_tsvector('english', body));
CREATE INDEX idx_jsonb ON events USING gin (metadata jsonb_path_ops);
```

**When**: `@>`, `?`, `?|`, `?&` on JSONB; `&&`, `@>` on arrays; `@@` for full-text
**jsonb_path_ops**: smaller, faster for containment only (`@>`) -- no key-existence queries
**Trade-off**: slower writes (2-3x), larger on disk, but dramatically faster reads for supported ops
**Maintenance**: `gin_pending_list_limit` controls fastupdate buffer; set lower for read-heavy tables

## GiST (Generalized Search Tree)

Handles geometric, range, and nearest-neighbor queries.

```sql
CREATE INDEX idx_location ON stores USING gist (geom);
CREATE INDEX idx_schedule ON bookings USING gist (tsrange(start_time, end_time));
CREATE INDEX idx_ip ON access_log USING gist (ip_range inet_ops);
```

**When**: PostGIS geometry, range type overlaps (`&&`), exclusion constraints, KNN (`<->`)
**vs GIN for full-text**: GiST is smaller but slower for exact matching; use for ranking queries

## BRIN (Block Range Index)

Tiny indexes for physically ordered data. Stores min/max per block range.

```sql
CREATE INDEX idx_events_ts ON events USING brin (created_at) WITH (pages_per_range = 32);
```

**When**: data is physically ordered by the indexed column (append-only time series, auto-inc IDs)
**Size**: ~1000x smaller than B-tree for large tables
**Limitation**: useless if data is not correlated with physical storage order
**Tuning**: `pages_per_range` -- lower = more precise but larger index; default 128, try 32-64 for time series

## Partial Indexes

Index a subset of rows. Smaller, faster, and cheaper to maintain.

```sql
CREATE INDEX idx_active_users ON users (email) WHERE active = true;
CREATE INDEX idx_pending_orders ON orders (created_at) WHERE status = 'pending';
```

**When**: queries always include a constant filter predicate; the filtered subset is <20% of table
**Critical**: query WHERE clause must match or imply the index predicate for planner to use it

## Covering Indexes (INCLUDE)

Store additional columns in index leaf pages to enable index-only scans.

```sql
CREATE INDEX idx_orders_user ON orders (user_id) INCLUDE (total, status);
```

**When**: query selects columns beyond the indexed ones; avoids heap fetches
**Trade-off**: larger index, but eliminates random I/O for covered queries
**Limitation**: INCLUDE columns cannot be used for filtering/sorting -- leaf storage only

## Expression Indexes

Index computed values.

```sql
CREATE INDEX idx_lower_email ON users (lower(email));
CREATE INDEX idx_year ON events (date_trunc('year', created_at));
CREATE INDEX idx_json_field ON orders ((metadata->>'priority'));
```

**When**: queries filter on a function result; the expression must match exactly

## Unique Indexes

Enforce uniqueness with optional partial constraint.

```sql
CREATE UNIQUE INDEX idx_unique_email ON users (lower(email));
CREATE UNIQUE INDEX idx_unique_active_slug ON products (slug) WHERE deleted_at IS NULL;
```

## Composite Index Design

### Column Order Rules

1. Equality columns first (exact match narrows scan immediately)
2. Range/inequality columns last (can only use one range predicate per scan)
3. High selectivity first among equality columns (optional optimization)

```sql
-- Query: WHERE tenant_id = $1 AND status = $2 AND created_at > $3
CREATE INDEX idx_tenant_status_created ON orders (tenant_id, status, created_at);
```

### Leftmost Prefix

A composite index on (a, b, c) supports:
- WHERE a = ?
- WHERE a = ? AND b = ?
- WHERE a = ? AND b = ? AND c = ?
- WHERE a = ? ORDER BY b
- NOT: WHERE b = ? (cannot skip leading column)

## Maintenance

```sql
SELECT schemaname, indexrelname, idx_scan, idx_tup_read, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes ORDER BY idx_scan ASC;

SELECT pg_size_pretty(pg_indexes_size('table_name'));
REINDEX INDEX CONCURRENTLY idx_name;
```

## Decision Matrix

| Query Pattern | Index Type |
|---------------|-----------|
| Equality, range, ORDER BY | B-tree |
| JSONB containment | GIN (jsonb_path_ops) |
| Array overlap/containment | GIN |
| Full-text search | GIN (tsvector) |
| Geometry, KNN | GiST |
| Range overlap, exclusion | GiST |
| Time-series on ordered data | BRIN |
| Filtered subset of rows | Partial (any type) |
| Avoid heap lookups | Covering (INCLUDE) |
| Function in WHERE | Expression |
