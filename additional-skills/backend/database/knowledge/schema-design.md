---
type: fact
title: "Schema Design"
---

# Schema Design

Normalization, denormalization decisions, primary key strategies, soft deletes, and audit trails.

## Normalization Guidelines

- 3NF as default for OLTP; denormalize with measured justification only
- Normalize when: data changes independently, consistency matters, write-heavy
- Denormalize when: read/write ratio >10:1, join cost proven excessive, bounded duplication

## Primary Key Strategy (2026)

### UUIDv7 (Recommended for distributed systems)
```sql
-- Time-sortable, globally unique, B-tree friendly
-- Format: timestamp(48bit) + random(74bit) + version(4bit) + variant(2bit)
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- PG 18: uuidv7()
    -- Or use application-generated UUIDv7
);
```

Benefits: no coordination, time-sortable (no page splits), globally unique
Trade-off: 16 bytes vs 4/8 bytes for integer; larger indexes

### Auto-increment (Fine for single-node)
```sql
CREATE TABLE orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);
```

Benefits: compact, human-readable, no fragmentation
Trade-off: not globally unique, leaks count, requires coordination

### Decision Matrix
| Scenario | Key Type |
|----------|----------|
| Single database, internal system | BIGINT IDENTITY |
| Distributed/microservices | UUIDv7 |
| Public-facing (hide count) | UUIDv7 or nanoid |
| Time-series (partition key) | TIMESTAMPTZ composite |
| Multi-tenant | (tenant_id, entity_id) composite |

## Soft Deletes

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index for active records (most queries)
CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;

-- Application-level: always add WHERE deleted_at IS NULL
-- Or use views:
CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;
```

### When to Use Soft Delete
- Audit/compliance requirements
- User-facing undo functionality
- Referenced by other tables (avoid FK violations)
- Analytics needs historical data

### When to Hard Delete
- PII cleanup (GDPR right to erasure)
- Ephemeral data (sessions, temp tokens)
- Large volume data with retention policy (use partitioning + DROP PARTITION)

## Audit Trails

### Trigger-Based Audit
```sql
CREATE TABLE audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_record ON audit_log (table_name, record_id, changed_at DESC);
```

### PostgreSQL System Versioning (Temporal Tables)
```sql
-- PG doesn't have native temporal (unlike MariaDB/SQL:2011)
-- Use: temporal_tables extension or application-level versioning
```

## Multi-Tenancy Patterns

| Pattern | Isolation | Complexity | Use When |
|---------|-----------|------------|----------|
| Shared table + tenant_id | Low | Low | SaaS startup, cost-sensitive |
| Schema per tenant | Medium | Medium | Moderate isolation needs |
| Database per tenant | High | High | Enterprise, compliance |

### Shared Table Pattern
```sql
-- Every table has tenant_id; every query filters by it
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    -- ... fields
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Row-level security (PostgreSQL)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

## Common Patterns

### State Machine Columns
```sql
-- Use CHECK constraint to enforce valid states
status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'active', 'archived')),
-- Track transitions
status_changed_at TIMESTAMPTZ DEFAULT now()
```

### Money
```sql
-- Never FLOAT. Use integer cents or NUMERIC.
amount_cents BIGINT NOT NULL,
currency CHAR(3) NOT NULL DEFAULT 'USD',
-- Or: amount NUMERIC(19,4) for precision
```

### Timestamps
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
-- Always TIMESTAMPTZ, never TIMESTAMP (loses timezone context)
```

## Anti-Patterns

- EAV (Entity-Attribute-Value) for structured data; use JSONB or proper columns
- Polymorphic associations without a discriminator column
- Generic "metadata" TEXT columns storing semicolon-separated values
- Circular foreign keys (A -> B -> A); restructure with junction tables
- `VARCHAR(255)` everywhere; use appropriate lengths or TEXT with CHECK
