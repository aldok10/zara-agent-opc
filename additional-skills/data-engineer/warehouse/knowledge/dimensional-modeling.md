# Dimensional Modeling

Star schema design, slowly changing dimensions, and fact table patterns for analytical workloads.

## Star Schema

Central fact table surrounded by dimension tables. Optimized for aggregation queries.

```
          dim_customer
              |
dim_date -- fact_orders -- dim_product
              |
          dim_store
```

### Fact Tables

Store measurements (metrics) at the grain of business events.

```sql
CREATE TABLE fact_orders (
    order_key BIGINT,           -- surrogate key
    date_key INT,               -- FK to dim_date
    customer_key BIGINT,        -- FK to dim_customer
    product_key BIGINT,         -- FK to dim_product
    store_key INT,              -- FK to dim_store
    order_id STRING,            -- natural/business key (degenerate dimension)
    quantity INT,
    unit_price NUMERIC(12,2),
    discount_amount NUMERIC(12,2),
    net_amount NUMERIC(12,2),   -- additive fact
    is_returned BOOLEAN         -- for filtered aggregation
);
```

**Grain**: one row = one order line item. Define grain before anything else.
**Additive facts**: can be summed across all dimensions (revenue, quantity).
**Semi-additive**: can be summed across some dimensions (account balance -- not across time).
**Non-additive**: cannot be summed (ratios, percentages -- store components separately).

### Dimension Tables

Store descriptive attributes for slicing/filtering facts.

```sql
CREATE TABLE dim_customer (
    customer_key BIGINT,        -- surrogate key (warehouse-generated)
    customer_id STRING,         -- natural key from source
    name STRING,
    email STRING,
    segment STRING,
    region STRING,
    country STRING,
    signup_date DATE,
    is_current BOOLEAN,         -- for SCD Type 2
    valid_from TIMESTAMP,
    valid_to TIMESTAMP
);

CREATE TABLE dim_date (
    date_key INT,               -- YYYYMMDD format
    full_date DATE,
    year INT,
    quarter INT,
    month INT,
    week_of_year INT,
    day_of_week INT,
    day_name STRING,
    is_weekend BOOLEAN,
    is_holiday BOOLEAN,
    fiscal_year INT,
    fiscal_quarter INT
);
```

## Slowly Changing Dimensions (SCD)

### Type 1: Overwrite

Simply update the dimension row. No history preserved.

```sql
UPDATE dim_customer
SET segment = 'enterprise', region = 'APAC'
WHERE customer_id = 'C-1234';
```

Use when: historical attribute value is irrelevant (typo corrections, enrichment).

### Type 2: Add New Row

Create a new row for each change. Preserves full history.

```sql
-- Expire current row
UPDATE dim_customer
SET is_current = FALSE, valid_to = CURRENT_TIMESTAMP()
WHERE customer_id = 'C-1234' AND is_current = TRUE;

-- Insert new version
INSERT INTO dim_customer (customer_key, customer_id, name, segment, is_current, valid_from, valid_to)
VALUES (NEXT_KEY(), 'C-1234', 'Acme Corp', 'enterprise', TRUE, CURRENT_TIMESTAMP(), '9999-12-31');
```

Use when: tracking attribute changes matters for analysis (segment migration, region changes).
**Surrogate key required**: natural key repeats across versions.

### Type 3: Add Column

Store previous value in a separate column.

```sql
ALTER TABLE dim_customer ADD COLUMN previous_segment STRING;

UPDATE dim_customer
SET previous_segment = segment, segment = 'enterprise'
WHERE customer_id = 'C-1234';
```

Use when: only one prior state matters (before/after comparison). Rarely used alone.

### Type 6 (Hybrid: 1+2+3)

Combines: new row (Type 2) + current attribute column (Type 3) + overwrite current on all rows (Type 1).

## Conformed Dimensions

Shared dimensions used across multiple fact tables consistently.

- `dim_date`: single date dimension reused everywhere
- `dim_customer`: same customer definition across sales, support, engagement facts
- Enforce via surrogate key linking and shared definition in dbt or modeling layer

## Aggregate/Summary Tables

Pre-computed aggregations for dashboards.

```sql
CREATE TABLE agg_daily_sales AS
SELECT
    date_key,
    store_key,
    product_key,
    SUM(net_amount) AS total_revenue,
    SUM(quantity) AS total_units,
    COUNT(*) AS order_count
FROM fact_orders
GROUP BY 1, 2, 3;
```

Maintain via incremental refresh (dbt incremental model or materialized view).

## Factless Fact Tables

Record events without numeric measurements.

```sql
-- Student attendance (who showed up)
CREATE TABLE fact_attendance (
    date_key INT,
    student_key BIGINT,
    class_key INT
);

-- Coverage: what products are eligible for promotion
CREATE TABLE fact_promotion_coverage (
    promotion_key INT,
    product_key BIGINT,
    store_key INT
);
```

Use for: event tracking, coverage analysis, negative analysis (what did NOT happen via anti-join).

## Bridge Tables

Handle many-to-many relationships between facts and dimensions.

```sql
CREATE TABLE bridge_order_promotion (
    order_key BIGINT,
    promotion_key INT,
    allocation_factor NUMERIC(5,4)  -- weighting factor sums to 1.0
);
```

## Design Process

1. **Select business process** (orders, shipments, clicks)
2. **Declare grain** (one row = what exactly?)
3. **Identify dimensions** (who, what, where, when, how)
4. **Identify facts** (measurements at that grain)
5. **Validate**: can every fact be stated at the declared grain?
