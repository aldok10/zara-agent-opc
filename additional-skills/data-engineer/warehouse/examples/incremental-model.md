---
type: example
title: "dbt Incremental Model with Deduplication"
---

# dbt Incremental Model with Deduplication

## Context
When processing event data that arrives with duplicates (at-least-once delivery from Kafka, webhook retries, CDC replays). The incremental model processes only new data on each run while deduplicating within and across batches.

## Code/Template

### Incremental Model

```sql
-- models/marts/fct_page_views.sql

{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='merge',
        partition_by={
            'field': 'event_date',
            'data_type': 'date',
            'granularity': 'day'
        },
        cluster_by=['user_id', 'page_path'],
        on_schema_change='append_new_columns'
    )
}}

WITH source_events AS (
    SELECT
        event_id,
        user_id,
        anonymous_id,
        session_id,
        page_path,
        page_title,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type,
        browser,
        country_code,
        event_timestamp,
        CAST(event_timestamp AS DATE) AS event_date,
        -- For dedup: rank duplicates by processing time
        ROW_NUMBER() OVER (
            PARTITION BY event_id
            ORDER BY _loaded_at DESC
        ) AS row_num
    FROM {{ source('raw_events', 'page_views') }}

    {% if is_incremental() %}
    -- Only process events newer than the latest in the target
    WHERE _loaded_at > (
        SELECT COALESCE(MAX(_loaded_at), '1970-01-01') FROM {{ this }}
    )
    {% endif %}
),

deduplicated AS (
    SELECT
        event_id,
        user_id,
        anonymous_id,
        session_id,
        page_path,
        page_title,
        referrer_url,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type,
        browser,
        country_code,
        event_timestamp,
        event_date,
        CURRENT_TIMESTAMP() AS _loaded_at
    FROM source_events
    WHERE row_num = 1
)

SELECT * FROM deduplicated
```

### Schema YAML

```yaml
# models/marts/fct_page_views.yml
version: 2

models:
  - name: fct_page_views
    description: >
      Deduplicated page view events. Incremental with merge strategy.
      Partitioned by event_date, clustered by user_id and page_path.
    config:
      tags: ['incremental', 'events', 'daily']

    columns:
      - name: event_id
        description: Unique event identifier (idempotency key)
        tests:
          - unique
          - not_null

      - name: user_id
        description: Authenticated user ID (null for anonymous)

      - name: event_timestamp
        description: When the page view occurred (client-side)
        tests:
          - not_null

      - name: event_date
        description: Date partition key derived from event_timestamp
        tests:
          - not_null

      - name: page_path
        description: URL path without query parameters
        tests:
          - not_null
```

### Late-Arriving Data Pattern

```sql
-- models/marts/fct_orders_incremental.sql
-- Handles late-arriving updates (order status changes days later)

{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge',
        merge_update_columns=[
            'order_status', 'updated_at', 'shipped_at',
            'delivered_at', 'cancelled_at', '_loaded_at'
        ]
    )
}}

WITH ranked_updates AS (
    SELECT
        order_id,
        customer_id,
        order_status,
        total_amount,
        currency,
        created_at,
        updated_at,
        shipped_at,
        delivered_at,
        cancelled_at,
        ROW_NUMBER() OVER (
            PARTITION BY order_id
            ORDER BY updated_at DESC, _kafka_offset DESC
        ) AS rn
    FROM {{ source('cdc', 'orders') }}

    {% if is_incremental() %}
    WHERE _kafka_timestamp > (
        SELECT DATEADD('hour', -6, MAX(_loaded_at)) FROM {{ this }}
    )
    {% endif %}
)

SELECT
    order_id,
    customer_id,
    order_status,
    total_amount,
    currency,
    created_at,
    updated_at,
    shipped_at,
    delivered_at,
    cancelled_at,
    CURRENT_TIMESTAMP() AS _loaded_at
FROM ranked_updates
WHERE rn = 1
```

### Full Refresh Safety

```sql
-- macros/safe_incremental.sql
-- Macro to force full refresh if data gap detected

{% macro check_data_continuity(model_ref, timestamp_col, max_gap_hours=6) %}

{% if is_incremental() %}
    {% set gap_query %}
        SELECT DATEDIFF('hour', MAX({{ timestamp_col }}), CURRENT_TIMESTAMP())
        FROM {{ model_ref }}
    {% endset %}

    {% set gap_hours = run_query(gap_query).columns[0][0] %}

    {% if gap_hours and gap_hours > max_gap_hours %}
        {{ log("WARNING: Data gap of " ~ gap_hours ~ " hours detected. Consider --full-refresh.", info=True) }}
    {% endif %}
{% endif %}

{% endmacro %}
```

### Run Commands

```bash
# Normal incremental run
dbt run --select fct_page_views

# Full refresh (rebuild from scratch)
dbt run --select fct_page_views --full-refresh

# Run with upstream dependencies
dbt run --select +fct_page_views

# Test after run
dbt test --select fct_page_views
```

## Key Points
- The `_loaded_at` lookback window (`DATEADD('hour', -6, MAX(...))`) reprocesses a buffer of recent data to catch late arrivals. Without this, events that arrive after the incremental cutoff are permanently lost.
- `merge_update_columns` limits which columns get overwritten on conflict. Immutable fields (customer_id, created_at) are only set on INSERT, preventing accidental overwrites from malformed updates.
- Always deduplicate within the incremental batch (`ROW_NUMBER()`) before merging. The `unique_key` merge handles cross-batch dedup, but within-batch duplicates would cause non-deterministic results.
