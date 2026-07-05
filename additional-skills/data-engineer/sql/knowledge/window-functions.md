---
type: fact
title: "Window Functions"
---

# Window Functions

PostgreSQL window functions compute values across sets of rows related to the current row without collapsing them into a single output row.

## Syntax

```sql
function_name(...) OVER (
  [PARTITION BY expr, ...]
  [ORDER BY expr [ASC|DESC] [NULLS {FIRST|LAST}], ...]
  [frame_clause]
)
```

## Ranking Functions

### ROW_NUMBER()

Assigns a unique sequential integer to each row within the partition. No ties -- always unique.

```sql
SELECT id, department, salary,
       ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;
```

Use for: deduplication (keep first), top-N per group, pagination within partitions.

### RANK()

Same as ROW_NUMBER but assigns the same rank to ties, leaving gaps after ties.

```sql
SELECT id, score,
       RANK() OVER (ORDER BY score DESC) AS rank
FROM leaderboard;
-- Scores: 100, 95, 95, 90 -> Ranks: 1, 2, 2, 4
```

### DENSE_RANK()

Like RANK but no gaps after ties.

```sql
SELECT id, score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM leaderboard;
-- Scores: 100, 95, 95, 90 -> Dense ranks: 1, 2, 2, 3
```

### NTILE(n)

Distributes rows into n approximately equal buckets.

```sql
SELECT id, revenue,
       NTILE(4) OVER (ORDER BY revenue DESC) AS quartile
FROM accounts;
```

## Offset Functions

### LAG(expr, offset, default)

Access a row at a given physical offset before the current row.

```sql
SELECT date, revenue,
       LAG(revenue, 1) OVER (ORDER BY date) AS prev_revenue,
       revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day
FROM daily_sales;
```

### LEAD(expr, offset, default)

Access a row at a given physical offset after the current row.

```sql
SELECT event_time, user_id,
       LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS next_event,
       LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time) - event_time AS time_to_next
FROM user_events;
```

### FIRST_VALUE / LAST_VALUE / NTH_VALUE

```sql
SELECT id, department, salary,
       FIRST_VALUE(salary) OVER w AS dept_highest,
       LAST_VALUE(salary) OVER w AS dept_lowest
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY salary DESC
             ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING);
```

LAST_VALUE requires explicit frame -- default frame ends at CURRENT ROW, not partition end.

## Frame Clauses

Frame defines the subset of partition rows used for computation.

### Frame Types

| Type | Meaning |
|------|---------|
| ROWS | Physical row offset |
| RANGE | Logical value range (requires ORDER BY on single numeric/date) |
| GROUPS | Peer group offset (PG 11+) |

### Frame Boundaries

| Boundary | Meaning |
|----------|---------|
| UNBOUNDED PRECEDING | Partition start |
| n PRECEDING | n rows/range before current |
| CURRENT ROW | Current row |
| n FOLLOWING | n rows/range after current |
| UNBOUNDED FOLLOWING | Partition end |

### Default Frame

When ORDER BY is specified: `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
When ORDER BY is omitted: `RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` (entire partition)

### Common Patterns

```sql
-- Running total
SUM(amount) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)

-- Moving 7-day average
AVG(value) OVER (ORDER BY date RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW)

-- Moving 3-row average
AVG(value) OVER (ORDER BY date ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING)
```

## Aggregate as Window

Any aggregate function works as a window function:

```sql
SELECT id, department, salary,
       SUM(salary) OVER (PARTITION BY department) AS dept_total,
       salary::numeric / SUM(salary) OVER (PARTITION BY department) AS pct_of_dept
FROM employees;
```

## FILTER Clause with Window

```sql
SELECT date, category, amount,
       SUM(amount) FILTER (WHERE category = 'refund')
         OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS refund_7d
FROM transactions;
```

## Performance Notes

- Window functions execute after WHERE, GROUP BY, HAVING -- before ORDER BY and LIMIT
- Multiple window functions sharing the same OVER clause share a single sort pass
- Use named WINDOW clause to avoid repetition and help planner
- Indexes on (PARTITION BY cols, ORDER BY cols) can avoid sort operations
- Window functions cannot be used in WHERE; wrap in a subquery or CTE

## Common Pitfalls

1. LAST_VALUE with default frame returns current row, not partition end
2. RANGE frame with multiple ORDER BY columns is disallowed
3. NTH_VALUE counts from frame start, not partition start
4. NULL handling: IGNORE NULLS available for LAG/LEAD/FIRST_VALUE/LAST_VALUE in PG 17+
5. DISTINCT inside window aggregates not supported -- use subquery
