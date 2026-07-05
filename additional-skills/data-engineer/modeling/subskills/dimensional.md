# Dimensional Modeling

Star schema, snowflake schema, slowly-changing dimensions, and fact table patterns.

## When to Load

- Designing data warehouse schema for analytics
- Implementing slowly-changing dimension tracking
- Choosing between star and snowflake schemas
- Optimizing query performance for analytical workloads

## Key Concepts

**Star Schema**
- Fact table: measurements/events (orders, clicks, transactions)
- Dimension tables: descriptive context (customer, product, date, location)
- Facts connect to dimensions via foreign keys
- Denormalized dimensions for query simplicity and performance

**Fact Table Types**
- Transaction: one row per event (order placed, payment received)
- Periodic snapshot: one row per entity per period (daily inventory levels)
- Accumulating snapshot: one row per process, updated as milestones occur
- Factless fact: records events with no measurable amount (student attendance)

**Slowly-Changing Dimensions (SCD)**
- Type 0: retain original value, never update (birth date)
- Type 1: overwrite old value (current address only)
- Type 2: add new row with version tracking (full history)
- Type 3: add column for previous value (limited history)
- Type 4: separate history table (mini-dimension)
- Type 6: hybrid of 1+2+3 (current + history + previous)

**Grain Definition**
- Grain = what one row in the fact table represents
- Define grain FIRST, then identify dimensions and facts
- Finer grain is more flexible (can always aggregate up)
- "One row per [entity] per [time period] per [event]"

## Patterns

```sql
-- SCD Type 2 with dbt snapshots
-- snapshots/scd_customers.sql
{% snapshot scd_customers %}
{{
    config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='timestamp',
        updated_at='updated_at',
    )
}}

select * from {{ source('ecommerce', 'customers') }}

{% endsnapshot %}

-- Result: adds dbt_valid_from, dbt_valid_to, dbt_scd_id columns
```

```sql
-- Star schema: fact_orders with conformed dimensions
CREATE TABLE fact_orders (
    order_key       BIGINT PRIMARY KEY,
    customer_key    BIGINT REFERENCES dim_customer(customer_key),
    product_key     BIGINT REFERENCES dim_product(product_key),
    date_key        INT REFERENCES dim_date(date_key),
    location_key    INT REFERENCES dim_location(location_key),
    order_quantity  INT,
    unit_price      DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    net_amount      DECIMAL(10,2)
);

-- Conformed date dimension
CREATE TABLE dim_date (
    date_key        INT PRIMARY KEY,  -- YYYYMMDD format
    full_date       DATE,
    day_of_week     SMALLINT,
    day_name        VARCHAR(10),
    month_number    SMALLINT,
    month_name      VARCHAR(10),
    quarter         SMALLINT,
    year            SMALLINT,
    is_weekend      BOOLEAN,
    is_holiday      BOOLEAN,
    fiscal_quarter  SMALLINT,
    fiscal_year     SMALLINT
);
```

**Design Process**
1. Select business process (orders, shipments, support tickets)
2. Declare the grain (one row per order line item)
3. Identify dimensions (who, what, where, when, how)
4. Identify facts (measurable quantities at that grain)

## Gotchas

- Surrogate keys in dimensions enable SCD without fact table changes
- Null foreign keys: use "unknown" dimension rows instead of NULL
- Late-arriving dimensions: insert placeholder row, update later
- Degenerate dimensions: dimension value stored directly in fact (order number)
- Snowflaking normalizes dimensions -- avoids redundancy but adds joins
- Junk dimensions: combine low-cardinality flags into single dimension table

## Verification

- Every fact row has valid dimension keys (referential integrity)
- SCD Type 2: no gaps or overlaps in valid_from/valid_to ranges
- Grain assertion: count(distinct grain_columns) == count(*)
- Aggregate from detailed grain matches known business totals
- Date dimension covers full required range with no gaps
