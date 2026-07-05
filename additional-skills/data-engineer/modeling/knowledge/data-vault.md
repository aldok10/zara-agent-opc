---
type: fact
title: "Data Vault"
---

# Data Vault

Hubs, links, satellites, and the Data Vault 2.0 methodology for scalable raw data warehousing.

## Core Concepts

Data Vault separates **structure** (relationships) from **context** (descriptive attributes) and **history** (changes over time). Designed for auditability, parallel loading, and scalability.

## Components

### Hubs (Business Keys)

Unique business entities. Never change once loaded.

```sql
CREATE TABLE hub_customer (
    hub_customer_hk BINARY(32),     -- hash of business key
    customer_id STRING,              -- business key (natural key)
    load_date TIMESTAMP,             -- first seen
    record_source STRING             -- source system
);
```

**Rules**:
- One hub per business concept (customer, product, order)
- Contains only: hash key + business key(s) + load metadata
- Never updated, only inserted (new business keys)
- Hash key = SHA-256(business_key) -- deterministic, parallelizable

### Links (Relationships)

Connect two or more hubs. Represent business relationships or transactions.

```sql
CREATE TABLE link_order (
    link_order_hk BINARY(32),       -- hash of all parent hub keys
    hub_customer_hk BINARY(32),     -- FK to hub_customer
    hub_product_hk BINARY(32),      -- FK to hub_product
    hub_store_hk BINARY(32),        -- FK to hub_store
    order_id STRING,                -- degenerate key (if applicable)
    load_date TIMESTAMP,
    record_source STRING
);
```

**Rules**:
- Links connect hubs (never other links)
- A link can connect 2+ hubs (multi-way relationship)
- Never updated, only inserted
- Hash key = SHA-256(concat(all_parent_hash_keys))

### Satellites (Context/History)

Store descriptive attributes and their history. Attached to hubs or links.

```sql
CREATE TABLE sat_customer_details (
    hub_customer_hk BINARY(32),     -- parent hub hash key
    load_date TIMESTAMP,            -- when this version was loaded
    load_end_date TIMESTAMP,        -- when superseded (NULL = current)
    hash_diff BINARY(32),           -- hash of all attribute columns
    name STRING,
    email STRING,
    phone STRING,
    segment STRING,
    region STRING,
    record_source STRING
);
```

**Rules**:
- One satellite per rate-of-change or source system
- New row only when attributes change (hash_diff comparison)
- Primary key: parent_hash_key + load_date
- `hash_diff` = SHA-256(concat(all_attribute_columns)) -- detect changes efficiently

## Loading Patterns

### Hub Loading

```sql
INSERT INTO hub_customer (hub_customer_hk, customer_id, load_date, record_source)
SELECT
    SHA2(UPPER(TRIM(src.customer_id)), 256) AS hub_customer_hk,
    src.customer_id,
    CURRENT_TIMESTAMP() AS load_date,
    'crm_system' AS record_source
FROM staging.customers src
WHERE NOT EXISTS (
    SELECT 1 FROM hub_customer h
    WHERE h.hub_customer_hk = SHA2(UPPER(TRIM(src.customer_id)), 256)
);
```

### Satellite Loading (Change Detection)

```sql
INSERT INTO sat_customer_details
SELECT
    src.hub_customer_hk,
    CURRENT_TIMESTAMP() AS load_date,
    NULL AS load_end_date,
    SHA2(CONCAT(src.name, src.email, src.phone, src.segment), 256) AS hash_diff,
    src.name,
    src.email,
    src.phone,
    src.segment,
    src.region,
    'crm_system' AS record_source
FROM staging.customers_prepared src
LEFT JOIN (
    SELECT * FROM sat_customer_details
    WHERE load_end_date IS NULL
) current_sat ON src.hub_customer_hk = current_sat.hub_customer_hk
WHERE current_sat.hub_customer_hk IS NULL
   OR current_sat.hash_diff != SHA2(CONCAT(src.name, src.email, src.phone, src.segment), 256);
```

## Specialized Constructs

### Effectivity Satellites

Track when a link relationship is active/inactive.

```sql
CREATE TABLE sat_order_eff (
    link_order_hk BINARY(32),
    load_date TIMESTAMP,
    effective_from DATE,
    effective_to DATE,           -- NULL = currently active
    is_active BOOLEAN,
    record_source STRING
);
```

### Same-As Links

Handle multiple business keys for the same entity (master data management).

```sql
CREATE TABLE link_customer_same_as (
    link_same_as_hk BINARY(32),
    hub_customer_master_hk BINARY(32),
    hub_customer_duplicate_hk BINARY(32),
    load_date TIMESTAMP,
    record_source STRING
);
```

### Point-In-Time (PIT) Tables

Performance optimization for joining hubs with multiple satellites.

```sql
CREATE TABLE pit_customer (
    hub_customer_hk BINARY(32),
    snapshot_date DATE,
    sat_customer_details_hk BINARY(32),
    sat_customer_details_load_date TIMESTAMP,
    sat_customer_contact_hk BINARY(32),
    sat_customer_contact_load_date TIMESTAMP
);
```

## Data Vault vs Star Schema

| Aspect | Data Vault | Star Schema |
|--------|-----------|-------------|
| Purpose | Raw integration, audit | Business consumption |
| Users | Data engineers | Analysts, BI tools |
| Loading | Parallel, additive | Transform-heavy |
| History | Full by design | SCD types |
| Flexibility | Add sources without redesign | Schema changes expensive |
| Query performance | Poor (many joins) | Optimized for aggregation |

## Best Practice: Data Vault + Business Vault + Star Schema

```
Sources -> Staging -> Raw Vault (hubs, links, sats)
                   -> Business Vault (computed satellites, bridge tables)
                   -> Information Mart (star schemas for BI)
```

## Anti-Patterns

- Putting business logic in Raw Vault (belongs in Business Vault or marts)
- Single satellite for all attributes (split by rate of change)
- Not using hash keys (makes parallel loading impossible)
- Querying Raw Vault directly from BI tools (too many joins)
- Skipping PIT tables for multi-satellite joins (kills query performance)
