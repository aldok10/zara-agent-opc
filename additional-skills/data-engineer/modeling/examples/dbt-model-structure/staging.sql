-- models/staging/stg_shopify__orders.sql

WITH source AS (
    SELECT * FROM {{ source('shopify', 'orders') }}
),

renamed AS (
    SELECT
        id AS order_id,
        CAST(customer_id AS STRING) AS customer_id,
        CAST(total_price AS NUMERIC(12, 2)) AS total_amount,
        CAST(total_discounts AS NUMERIC(12, 2)) AS discount_amount,
        LOWER(TRIM(financial_status)) AS payment_status,
        LOWER(TRIM(fulfillment_status)) AS fulfillment_status,
        CAST(created_at AS TIMESTAMP) AS ordered_at,
        CAST(updated_at AS TIMESTAMP) AS updated_at,
        CAST(cancelled_at AS TIMESTAMP) AS cancelled_at,
        currency,
        CAST(total_line_items_price AS NUMERIC(12, 2)) AS subtotal_amount,
        source_name AS order_source,
        _loaded_at AS loaded_at
    FROM source
),

deduplicated AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY loaded_at DESC) AS rn
    FROM renamed
)

SELECT * EXCEPT(rn)
FROM deduplicated
WHERE rn = 1
