---
type: fact
title: "dbt Patterns"
---

# dbt Patterns

Staging, intermediate, and mart layer design, macros, testing, and project structure for dbt Core/Cloud.

## Project Structure

```
models/
  staging/
    stg_stripe__payments.sql
    stg_shopify__orders.sql
    _staging__models.yml
  intermediate/
    int_orders__enriched.sql
    int_customers__aggregated.sql
    _intermediate__models.yml
  marts/
    finance/
      fct_revenue.sql
      dim_customers.sql
      _finance__models.yml
    marketing/
      fct_campaigns.sql
      _marketing__models.yml
```

## Naming Conventions

| Layer | Pattern | Example |
|-------|---------|---------|
| Staging | `stg_{source}__{entity}` | `stg_stripe__payments` |
| Intermediate | `int_{entity}__{verb}` | `int_orders__enriched` |
| Mart (fact) | `fct_{event/process}` | `fct_orders` |
| Mart (dimension) | `dim_{entity}` | `dim_customers` |

## Layer Responsibilities

### Staging

- 1:1 with source tables
- Rename columns to standard conventions
- Cast types correctly
- Light cleaning (trim, lower)
- No joins, no aggregations
- Materialized as views (no storage cost)

### Intermediate

- Join staging models together
- Apply business logic transforms
- Filter and deduplicate
- Still reusable (not tied to one mart)
- Materialized as views or ephemeral

### Marts

- Business-facing, consumable by BI tools
- Star schema (facts + dimensions)
- Aggregation and metrics calculations
- Materialized as tables or incremental

## Materialization Strategies

```yaml
# dbt_project.yml
models:
  my_project:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      finance:
        +materialized: incremental
```

### Incremental Models

```sql
{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge',
        on_schema_change='append_new_columns'
    )
}}

SELECT
    order_id,
    customer_id,
    amount,
    created_at,
    updated_at
FROM {{ ref('stg_shopify__orders') }}

{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

## Macros

### Reusable Logic

```sql
-- macros/cents_to_dollars.sql
{% macro cents_to_dollars(column_name) %}
    ROUND({{ column_name }}::NUMERIC / 100, 2)
{% endmacro %}

-- Usage in model
SELECT
    payment_id,
    {{ cents_to_dollars('amount_cents') }} AS amount_dollars
FROM {{ ref('stg_stripe__payments') }}
```

### Generate Schema Name

```sql
-- macros/generate_schema_name.sql
{% macro generate_schema_name(custom_schema_name, node) %}
    {% if custom_schema_name %}
        {{ custom_schema_name | trim }}
    {% else %}
        {{ target.schema }}
    {% endif %}
{% endmacro %}
```

### Surrogate Key

```sql
{% macro generate_surrogate_key(fields) %}
    {{ dbt_utils.generate_surrogate_key(fields) }}
{% endmacro %}
```

## Testing

### Schema Tests (YAML)

```yaml
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
      - name: amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              inclusive: true
```

### Custom Generic Tests

```sql
-- tests/generic/test_positive_value.sql
{% test positive_value(model, column_name) %}
SELECT {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} < 0
{% endtest %}
```

### Singular Tests

```sql
-- tests/assert_total_revenue_positive.sql
SELECT SUM(amount) AS total
FROM {{ ref('fct_orders') }}
HAVING SUM(amount) < 0
```

## Sources

```yaml
sources:
  - name: stripe
    schema: raw_stripe
    freshness:
      warn_after: {count: 12, period: hour}
      error_after: {count: 24, period: hour}
    loaded_at_field: _loaded_at
    tables:
      - name: payments
        identifier: stripe_payments
```

## Exposures

```yaml
exposures:
  - name: weekly_revenue_dashboard
    type: dashboard
    owner:
      name: Data Team
      email: data@company.com
    depends_on:
      - ref('fct_revenue')
      - ref('dim_customers')
    url: https://looker.company.com/dashboards/42
```

## Performance

- Use `incremental` for fact tables growing daily
- Use `table` for dimensions that change infrequently
- Add `cluster_by` / `partition_by` config for warehouse optimization
- Use `ephemeral` for intermediate CTEs to avoid extra table creation
- Limit full-refresh frequency for large incremental models

## Common Patterns

### Deduplication at Staging

```sql
WITH source AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY _loaded_at DESC) AS rn
    FROM {{ source('shopify', 'orders') }}
)
SELECT * FROM source WHERE rn = 1
```

### Pivot/Unpivot

```sql
{{ dbt_utils.pivot(
    column='status',
    values=['pending', 'shipped', 'delivered'],
    then_value='order_id',
    agg='COUNT'
) }}
```

## Anti-Patterns

- Joins in staging models (keep them pure 1:1 renames)
- Business logic in multiple layers (centralize in intermediate)
- Not using `ref()` (breaks lineage)
- Overly complex models (>200 lines -- split into intermediate steps)
- Testing only uniqueness/not_null (add business logic tests)
- No freshness checks on sources
