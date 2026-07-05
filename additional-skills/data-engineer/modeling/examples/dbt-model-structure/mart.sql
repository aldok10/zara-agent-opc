-- models/marts/finance/fct_revenue.sql

{{
    config(
        materialized='incremental',
        unique_key='order_id',
        incremental_strategy='merge',
        partition_by={
            'field': 'order_date',
            'data_type': 'date',
            'granularity': 'day'
        },
        cluster_by=['customer_segment', 'region'],
        on_schema_change='append_new_columns'
    )
}}

WITH orders AS (
    SELECT * FROM {{ ref('int_orders__enriched') }}
    {% if is_incremental() %}
    WHERE ordered_at > (SELECT MAX(ordered_at) FROM {{ this }})
    {% endif %}
),

final AS (
    SELECT
        order_id,
        customer_id,
        customer_segment,
        region,
        DATE(ordered_at) AS order_date,
        ordered_at,
        order_source,
        order_tier,
        total_amount AS gross_revenue,
        discount_amount,
        net_amount AS net_revenue,
        total_paid,
        outstanding_amount,
        payment_count,
        payment_status,
        fulfillment_status,
        is_cancelled,
        customer_tenure_days,
        CASE
            WHEN customer_tenure_days <= 30 THEN 'new'
            WHEN customer_tenure_days <= 365 THEN 'active'
            ELSE 'mature'
        END AS customer_lifecycle_stage
    FROM orders
    WHERE NOT is_cancelled
)

SELECT * FROM final
