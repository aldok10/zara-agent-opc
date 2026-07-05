-- models/intermediate/int_orders__enriched.sql

WITH orders AS (
    SELECT * FROM {{ ref('stg_shopify__orders') }}
),

customers AS (
    SELECT * FROM {{ ref('stg_shopify__customers') }}
),

payments AS (
    SELECT
        order_id,
        SUM(amount) AS total_paid,
        COUNT(*) AS payment_count,
        MAX(paid_at) AS last_payment_at
    FROM {{ ref('stg_stripe__payments') }}
    WHERE status = 'succeeded'
    GROUP BY order_id
),

enriched AS (
    SELECT
        orders.order_id,
        orders.customer_id,
        customers.customer_segment,
        customers.signup_date AS customer_signup_date,
        customers.region,
        orders.total_amount,
        orders.discount_amount,
        orders.total_amount - orders.discount_amount AS net_amount,
        COALESCE(payments.total_paid, 0) AS total_paid,
        orders.total_amount - COALESCE(payments.total_paid, 0) AS outstanding_amount,
        payments.payment_count,
        orders.payment_status,
        orders.fulfillment_status,
        orders.order_source,
        orders.ordered_at,
        orders.cancelled_at,
        orders.cancelled_at IS NOT NULL AS is_cancelled,
        DATE_DIFF(
            CURRENT_DATE(),
            DATE(customers.signup_date),
            DAY
        ) AS customer_tenure_days,
        CASE
            WHEN orders.total_amount >= 500 THEN 'high_value'
            WHEN orders.total_amount >= 100 THEN 'medium_value'
            ELSE 'low_value'
        END AS order_tier
    FROM orders
    LEFT JOIN customers ON orders.customer_id = customers.customer_id
    LEFT JOIN payments ON orders.order_id = payments.order_id
)

SELECT * FROM enriched
