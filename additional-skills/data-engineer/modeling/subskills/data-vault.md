---
type: subskill
title: "Data Vault Modeling"
---

# Data Vault Modeling

Hubs, links, satellites, point-in-time tables, and Data Vault 2.0 patterns.

## When to Load

- Building an enterprise data warehouse that must integrate many sources
- Designing for auditability and full history retention
- Implementing parallel loading from multiple source systems
- Separating business keys from descriptive attributes

## Key Concepts

**Core Components**
- Hub: unique business keys with metadata (customer_id, order_number)
- Link: relationships between hubs (customer_order, order_product)
- Satellite: descriptive attributes with history (customer_details, order_status)
- Each component loads independently and in parallel

**Design Principles**
- Business keys drive the model (not surrogate keys from source systems)
- Insert-only: never update or delete (full audit trail)
- Load date + record source on every table
- Hash keys for performance (MD5/SHA-1 of business key)
- Parallel loading: each satellite loads independently

**Hub Structure**
- Hash key (PK): hash of business key
- Business key: natural key from source
- Load date: when first seen
- Record source: which system provided it

**Link Structure**
- Hash key (PK): hash of all connected hub business keys
- Hub hash keys (FKs): reference to each connected hub
- Load date: when relationship first seen
- Record source: which system provided it

**Satellite Structure**
- Hub/Link hash key (PK part 1): parent reference
- Load date (PK part 2): when this version was loaded
- Hash diff: hash of all attributes (for change detection)
- Attributes: descriptive data
- Record source: origin system

## Patterns

```sql
-- Hub: business key registration
CREATE TABLE hub_customer (
    customer_hk     BINARY(16) PRIMARY KEY,  -- MD5(customer_bk)
    customer_bk     VARCHAR(50) NOT NULL,     -- business key
    load_date       TIMESTAMP NOT NULL,
    record_source   VARCHAR(50) NOT NULL
);

-- Link: relationship between customer and order
CREATE TABLE link_customer_order (
    customer_order_hk  BINARY(16) PRIMARY KEY,  -- MD5(customer_bk || order_bk)
    customer_hk        BINARY(16) NOT NULL,
    order_hk           BINARY(16) NOT NULL,
    load_date          TIMESTAMP NOT NULL,
    record_source      VARCHAR(50) NOT NULL
);

-- Satellite: customer descriptive attributes with history
CREATE TABLE sat_customer_details (
    customer_hk     BINARY(16) NOT NULL,
    load_date       TIMESTAMP NOT NULL,
    hash_diff       BINARY(16) NOT NULL,  -- MD5(all attributes)
    customer_name   VARCHAR(200),
    email           VARCHAR(200),
    phone           VARCHAR(50),
    segment         VARCHAR(50),
    record_source   VARCHAR(50) NOT NULL,
    PRIMARY KEY (customer_hk, load_date)
);
```

```sql
-- Point-in-Time (PIT) table for query performance
CREATE TABLE pit_customer AS
SELECT
    h.customer_hk,
    snap.snapshot_date,
    COALESCE(sd.load_date, '1900-01-01') AS sat_details_load_date,
    COALESCE(sa.load_date, '1900-01-01') AS sat_address_load_date
FROM hub_customer h
CROSS JOIN date_spine snap
LEFT JOIN LATERAL (
    SELECT MAX(load_date) AS load_date
    FROM sat_customer_details
    WHERE customer_hk = h.customer_hk
    AND load_date <= snap.snapshot_date
) sd ON TRUE
LEFT JOIN LATERAL (
    SELECT MAX(load_date) AS load_date
    FROM sat_customer_address
    WHERE customer_hk = h.customer_hk
    AND load_date <= snap.snapshot_date
) sa ON TRUE;
```

**Loading Pattern**
1. Stage: land raw data with load_date and source
2. Hash: compute hash keys and hash diffs
3. Hub: insert new business keys (not already in hub)
4. Link: insert new relationships (not already in link)
5. Satellite: insert where hash_diff differs from latest record

## Gotchas

- Hash collisions: MD5 is fine for Data Vault (not security-critical)
- PIT tables are essential for query performance -- without them, queries are slow
- Multi-active satellites: when an entity has multiple active records (e.g., phone numbers)
- Same-as links: handle when two hubs represent the same real-world entity
- Effectivity satellites: track when a link relationship is active/inactive
- Business Vault: add computed/derived satellites (not raw vault)

## Verification

- Hub uniqueness: no duplicate business keys
- Link uniqueness: no duplicate relationship combinations
- Satellite change detection: new rows only inserted when hash_diff changes
- PIT table covers all required snapshot dates without gaps
- End-to-end: source count matches hub count for each entity type
