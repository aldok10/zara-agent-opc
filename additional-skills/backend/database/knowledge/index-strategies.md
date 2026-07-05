# Index Strategies

When to use each index type, design principles, and common mistakes.

## B-tree (Default)

Best for: equality, range, sorting, prefix matching.

```sql
-- Covers: =, <, >, <=, >=, BETWEEN, IN, IS NULL, LIKE 'prefix%'
CREATE INDEX idx_orders_date ON orders (created_at);
CREATE INDEX idx_users_email ON users (email);  -- unique lookups
```

- Column order in composite: equality -> sort -> range (ESR rule)
- Supports index-only scans with INCLUDE (covering index)
- Useless for: `LIKE '%suffix'`, array containment, full-text

## GIN (Generalized Inverted Index)

Best for: multi-valued columns (arrays, JSONB, full-text).

```sql
-- JSONB containment queries
CREATE INDEX idx_tags ON articles USING gin (tags);
-- Query: WHERE tags @> '["database"]'

-- Full-text search
CREATE INDEX idx_fts ON documents USING gin (to_tsvector('english', content));

-- Array overlap
CREATE INDEX idx_skills ON developers USING gin (skills);
-- Query: WHERE skills && ARRAY['go', 'rust']
```

- Slow to update (decompose + insert each key)
- Use `jsonb_path_ops` for pure containment (@>) - 3x smaller than default
- `gin_pending_list_limit` controls deferred index updates

## GiST (Generalized Search Tree)

Best for: geometric, range types, nearest-neighbor, PostGIS.

```sql
-- Range overlap (scheduling, booking)
CREATE INDEX idx_booking_range ON bookings USING gist (tstzrange(start_at, end_at));
-- Query: WHERE tstzrange(start_at, end_at) && tstzrange($1, $2)

-- PostGIS spatial
CREATE INDEX idx_location ON stores USING gist (geom);
-- Query: WHERE ST_DWithin(geom, ST_MakePoint($lon, $lat)::geography, 5000)

-- pgvector nearest neighbor (IVFFlat)
CREATE INDEX idx_embeddings ON docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

- Lossy: may produce false positives requiring recheck
- Slower than B-tree for simple equality; use only when B-tree can't help

## BRIN (Block Range Index)

Best for: naturally ordered data (time-series, append-only, monotonic IDs).

```sql
-- Time-series table where rows are inserted in order
CREATE INDEX idx_events_time ON events USING brin (created_at) WITH (pages_per_range = 32);
```

- Tiny index size (1000x smaller than B-tree for large tables)
- Only effective when physical order correlates with logical order
- Useless after many random UPDATEs that scatter data across pages
- Check correlation: `SELECT correlation FROM pg_stats WHERE tablename='events' AND attname='created_at'`
- Correlation >0.9 = BRIN works well

## Partial Indexes

```sql
-- Only 2% of orders are 'pending' but queried constantly
CREATE INDEX idx_pending ON orders (created_at DESC) WHERE status = 'pending';

-- Only index non-null values
CREATE INDEX idx_verified ON users (verified_at) WHERE verified_at IS NOT NULL;
```

- Dramatically smaller than full indexes
- Query WHERE clause must match or imply the index predicate
- Combine with composite: `CREATE INDEX ... ON orders (user_id, created_at) WHERE status = 'active'`

## Covering Indexes (INCLUDE)

```sql
-- PostgreSQL 11+ / SQL Server
CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC)
INCLUDE (total, status);
-- Index-only scan: no heap fetch needed for these columns
```

- INCLUDE columns not used for filtering/sorting, only for retrieval
- Avoids heap access = faster queries on hot data
- Trade-off: larger index, slower writes

## Design Principles

1. Index what you query, not what exists
2. Measure before adding: check `pg_stat_user_indexes.idx_scan` after 1 week
3. Composite indexes replace multiple single-column indexes for combined predicates
4. Every index slows writes; tables with >8 indexes need justification
5. Drop unused indexes: `idx_scan = 0` over 30 days = candidate for removal
6. Never index low-cardinality columns alone (boolean, status with 3 values) unless partial

## Decision Matrix

| Query Pattern | Index Type |
|---------------|------------|
| `WHERE col = $1` | B-tree |
| `WHERE col BETWEEN $1 AND $2` | B-tree (or BRIN if ordered) |
| `ORDER BY col` | B-tree |
| `WHERE jsonb_col @> '{...}'` | GIN |
| `WHERE array_col && ARRAY[...]` | GIN |
| `WHERE tsv @@ to_tsquery(...)` | GIN |
| `WHERE ST_DWithin(geom, ...)` | GiST |
| `WHERE range && range` | GiST |
| `ORDER BY embedding <-> $1` | HNSW or IVFFlat (GiST) |
| Time-series, append-only | BRIN |
| Rare status values queried often | Partial B-tree |
