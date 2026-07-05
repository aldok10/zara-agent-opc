---
type: example
title: "SCD Type 2 Implementation"
---

# SCD Type 2 Implementation (Slowly Changing Dimension)

## Context
When you need to track full history of dimension changes (e.g., customer address changes, product price updates, employee role changes). SCD Type 2 creates a new row for each change, preserving the complete timeline for accurate historical reporting.

## Code/Template

### Table DDL

```sql
CREATE TABLE dim_customer (
    customer_key        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id         VARCHAR(50)     NOT NULL,  -- natural/business key
    full_name           VARCHAR(200)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    phone               VARCHAR(50),
    address_street      VARCHAR(300),
    address_city        VARCHAR(100),
    address_state       VARCHAR(50),
    address_zip         VARCHAR(20),
    address_country     VARCHAR(3),
    membership_tier     VARCHAR(20),
    -- SCD Type 2 metadata
    effective_from      TIMESTAMP       NOT NULL,
    effective_to        TIMESTAMP,           -- NULL = current record
    is_current          BOOLEAN         NOT NULL DEFAULT TRUE,
    record_hash         VARCHAR(64)     NOT NULL,  -- SHA-256 of tracked columns
    loaded_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_customer_bk ON dim_customer (customer_id, is_current);
CREATE INDEX idx_dim_customer_effective ON dim_customer (customer_id, effective_from, effective_to);
```

### Pure SQL Merge (PostgreSQL / Snowflake pattern)

```sql
-- Stage: incoming source data with computed hash
WITH source AS (
    SELECT
        customer_id,
        full_name,
        email,
        phone,
        address_street,
        address_city,
        address_state,
        address_zip,
        address_country,
        membership_tier,
        SHA2(CONCAT_WS('|',
            full_name, email, phone,
            address_street, address_city, address_state,
            address_zip, address_country, membership_tier
        ), 256) AS record_hash
    FROM staging.raw_customers
),

-- Identify changes: source hash differs from current dimension hash
changes AS (
    SELECT s.*
    FROM source s
    LEFT JOIN dim_customer d
        ON s.customer_id = d.customer_id
        AND d.is_current = TRUE
    WHERE d.customer_key IS NULL           -- new customer
       OR d.record_hash != s.record_hash   -- changed customer
)

-- Step 1: Close existing records for changed customers
UPDATE dim_customer
SET effective_to = CURRENT_TIMESTAMP,
    is_current = FALSE
WHERE customer_id IN (SELECT customer_id FROM changes)
  AND is_current = TRUE;

-- Step 2: Insert new version rows
INSERT INTO dim_customer (
    customer_id, full_name, email, phone,
    address_street, address_city, address_state,
    address_zip, address_country, membership_tier,
    effective_from, effective_to, is_current, record_hash
)
SELECT
    customer_id, full_name, email, phone,
    address_street, address_city, address_state,
    address_zip, address_country, membership_tier,
    CURRENT_TIMESTAMP,   -- effective_from
    NULL,                -- effective_to (current)
    TRUE,                -- is_current
    record_hash
FROM changes;
```

### dbt Implementation (snapshot)

```yaml
# models/staging/stg_customers.yml
version: 2
models:
  - name: stg_customers
    columns:
      - name: customer_id
        tests:
          - not_null
          - unique
```

```sql
-- snapshots/snap_customer.sql
{% raw %}
{% snapshot snap_customer %}

{{
    config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='check',
        check_cols=[
            'full_name', 'email', 'phone',
            'address_street', 'address_city', 'address_state',
            'address_zip', 'address_country', 'membership_tier'
        ],
        invalidate_hard_deletes=True
    )
}}

SELECT
    customer_id,
    full_name,
    email,
    phone,
    address_street,
    address_city,
    address_state,
    address_zip,
    address_country,
    membership_tier
FROM {{ source('raw', 'customers') }}

{% endsnapshot %}
{% endraw %}
```

```sql
-- models/marts/dim_customer.sql
-- Wrap the snapshot into a clean dimension with surrogate key

WITH snapshot_data AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(['customer_id', 'dbt_valid_from']) }} AS customer_key,
        customer_id,
        full_name,
        email,
        phone,
        address_street,
        address_city,
        address_state,
        address_zip,
        address_country,
        membership_tier,
        dbt_valid_from AS effective_from,
        dbt_valid_to AS effective_to,
        CASE WHEN dbt_valid_to IS NULL THEN TRUE ELSE FALSE END AS is_current
    FROM {{ ref('snap_customer') }}
)

SELECT * FROM snapshot_data
```

### Query Patterns

```sql
-- Get current state of a customer
SELECT * FROM dim_customer
WHERE customer_id = 'cust_001' AND is_current = TRUE;

-- Get customer state at a specific point in time
SELECT * FROM dim_customer
WHERE customer_id = 'cust_001'
  AND effective_from <= '2026-03-15 10:00:00'
  AND (effective_to > '2026-03-15 10:00:00' OR effective_to IS NULL);

-- Join fact table to get dimension values AS OF the fact event time
SELECT
    f.order_id,
    f.order_date,
    f.amount,
    d.full_name,
    d.membership_tier,
    d.address_city
FROM fact_orders f
JOIN dim_customer d
    ON f.customer_id = d.customer_id
    AND f.order_date >= d.effective_from
    AND (f.order_date < d.effective_to OR d.effective_to IS NULL);
```

## Key Points
- Use `record_hash` (SHA-256 of tracked columns) to detect changes efficiently. Comparing a single hash is faster and cleaner than comparing 10+ individual columns.
- dbt snapshots handle the SCD2 logic automatically with `strategy='check'`. Use `invalidate_hard_deletes=True` to close records when source rows disappear.
- Always join facts to dimensions using the effective date range, not just `is_current`. This ensures historical reports show the values that were true at the time of the transaction.
