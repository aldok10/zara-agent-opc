---
type: subskill
title: "dbt Project Patterns"
---

# dbt Project Patterns

Project structure, staging/marts layers, macros, testing patterns, and incremental models.

## When to Load

- Structuring a dbt project from scratch or refactoring existing
- Writing custom macros for reusable SQL logic
- Implementing data tests and documentation
- Building incremental models for large datasets

## Key Concepts

**Project Structure**
```
dbt_project/
  models/
    staging/          -- 1:1 with source tables, rename + cast + clean
      stg_orders.sql
      stg_customers.sql
    intermediate/     -- business logic building blocks
      int_orders_enriched.sql
    marts/           -- final business entities
      dim_customers.sql
      fct_orders.sql
  macros/            -- reusable SQL functions
  tests/             -- custom data tests
  seeds/             -- static reference data (CSV)
  snapshots/         -- SCD Type 2 tracking
```

**Layer Responsibilities**
- Sources: raw data declarations with freshness checks
- Staging: 1:1 with source, only renaming/casting/basic cleaning
- Intermediate: joins and business logic, not exposed to consumers
- Marts: final consumer-facing models, star schema or OBT

**Materialization Strategies**
- View: lightweight, always fresh, good for staging
- Table: full rebuild each run, good for small-medium marts
- Incremental: append/merge new records only, good for large fact tables
- Ephemeral: inline CTE (no database object created)

## Patterns

```sql
-- staging/stg_orders.sql
{{ config(materialized='view') }}

with source as (
    select * from {{ source('ecommerce', 'raw_orders') }}
),

renamed as (
    select
        id as order_id,
        user_id as customer_id,
        cast(order_date as date) as order_date,
        cast(amount as decimal(10,2)) as order_amount,
        lower(status) as order_status,
        _loaded_at as loaded_at
    from source
)

select * from renamed
```

```sql
-- marts/fct_orders.sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge',
    on_schema_change='append_new_columns'
) }}

with orders as (
    select * from {{ ref('stg_orders') }}
    {% if is_incremental() %}
    where loaded_at > (select max(loaded_at) from {{ this }})
    {% endif %}
),

customers as (
    select * from {{ ref('dim_customers') }}
)

select
    o.order_id,
    o.customer_id,
    c.customer_segment,
    o.order_date,
    o.order_amount,
    o.order_status,
    o.loaded_at
from orders o
left join customers c on o.customer_id = c.customer_id
```

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name) %}
    cast({{ column_name }} as decimal(10,2)) / 100.0
{% endmacro %}
```

**Testing Patterns**
```yaml
# schema.yml
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: order_amount
        tests:
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000
```

## Gotchas

- Incremental models: first run is always a full refresh (no `this` table yet)
- `ref()` creates a DAG dependency -- circular references will fail
- Jinja whitespace control matters: `{%- -%}` to avoid blank lines in compiled SQL
- `dbt run` only runs models; `dbt build` runs models + tests + snapshots + seeds
- Schema changes on incremental: `on_schema_change='sync_all_columns'` for full sync

## Verification

- `dbt build` completes with zero failures (models + tests)
- All models have at least: unique key test, not_null on key columns
- Source freshness within expected SLA (`dbt source freshness`)
- Compiled SQL (target/compiled/) produces expected query plans
- Row count assertions pass for critical models
