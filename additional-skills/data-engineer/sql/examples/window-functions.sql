-- Window Functions: Practical Examples

-- 1. ROW_NUMBER: Deduplicate -- keep latest record per entity
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
    FROM user_profiles
)
SELECT user_id, email, name, updated_at
FROM ranked
WHERE rn = 1;

-- 2. ROW_NUMBER: Top-N per group
WITH ranked_products AS (
    SELECT category_id, product_id, revenue,
           ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS rank
    FROM product_sales
    WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT category_id, product_id, revenue
FROM ranked_products
WHERE rank <= 5;

-- 3. LAG/LEAD: Day-over-day change
SELECT
    date,
    daily_revenue,
    LAG(daily_revenue) OVER (ORDER BY date) AS prev_day,
    ROUND(
        100.0 * (daily_revenue - LAG(daily_revenue) OVER (ORDER BY date))
        / NULLIF(LAG(daily_revenue) OVER (ORDER BY date), 0),
        2
    ) AS pct_change
FROM daily_metrics
ORDER BY date;

-- 4. Running total with reset
SELECT
    order_date,
    customer_id,
    amount,
    SUM(amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS UNBOUNDED PRECEDING
    ) AS cumulative_spend
FROM orders;

-- 5. Moving average (7-day)
SELECT
    date,
    value,
    AVG(value) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_7d
FROM daily_metrics;

-- 6. RANK with ties for leaderboard
SELECT
    player_id,
    score,
    RANK() OVER (ORDER BY score DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM game_scores
WHERE season = 2026;

-- 7. Percentile / quartile bucketing
SELECT
    customer_id,
    lifetime_value,
    NTILE(4) OVER (ORDER BY lifetime_value DESC) AS value_quartile
FROM customers;

-- 8. Time between events (session gap detection)
SELECT
    user_id,
    event_time,
    LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_event,
    event_time - LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS gap,
    CASE
        WHEN event_time - LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) > INTERVAL '30 minutes'
        THEN 1 ELSE 0
    END AS new_session_flag
FROM user_events;

-- 9. Percent of total within group
SELECT
    department,
    employee_id,
    salary,
    ROUND(100.0 * salary / SUM(salary) OVER (PARTITION BY department), 2) AS pct_of_dept,
    ROUND(100.0 * salary / SUM(salary) OVER (), 2) AS pct_of_total
FROM employees;

-- 10. FIRST_VALUE / LAST_VALUE with proper frame
SELECT
    department,
    employee_id,
    salary,
    FIRST_VALUE(employee_id) OVER w AS highest_paid,
    LAST_VALUE(employee_id) OVER w AS lowest_paid
FROM employees
WINDOW w AS (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
);

-- 11. Cumulative distribution
SELECT
    employee_id,
    salary,
    CUME_DIST() OVER (ORDER BY salary) AS cumulative_dist,
    PERCENT_RANK() OVER (ORDER BY salary) AS percent_rank
FROM employees;

-- 12. Named WINDOW clause for reuse
SELECT
    date,
    category,
    amount,
    SUM(amount) OVER w AS running_total,
    AVG(amount) OVER w AS running_avg,
    COUNT(*) OVER w AS running_count
FROM transactions
WINDOW w AS (PARTITION BY category ORDER BY date ROWS UNBOUNDED PRECEDING)
ORDER BY category, date;
