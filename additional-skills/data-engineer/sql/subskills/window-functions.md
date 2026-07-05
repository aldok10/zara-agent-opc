---
type: subskill
title: "Window Functions"
---

# Window Functions

## Core Concepts

- Window functions compute values across a set of rows related to the current row without collapsing them
- Unlike GROUP BY, window functions preserve individual rows while adding aggregate context
- PARTITION BY defines the window scope; ORDER BY defines row sequence within the window
- Frame clause (ROWS BETWEEN / RANGE BETWEEN) controls exactly which rows are included
- Common families: ranking (ROW_NUMBER, RANK, DENSE_RANK), aggregate (SUM, AVG, COUNT), offset (LAG, LEAD, FIRST_VALUE)

## Key Practices

- Use ROW_NUMBER + PARTITION BY for deduplication: pick one row per group deterministically
- Running totals: SUM(amount) OVER (PARTITION BY account ORDER BY date ROWS UNBOUNDED PRECEDING)
- Compare to previous: LAG(value, 1) OVER (ORDER BY date) for period-over-period changes
- Use QUALIFY (where supported) to filter window results without a subquery
- Name windows with WINDOW clause for readability when reusing the same partition/order

## Common Mistakes

- Forgetting ORDER BY in ranking functions: ROW_NUMBER without ORDER BY is non-deterministic
- Confusing RANK vs DENSE_RANK vs ROW_NUMBER — they handle ties differently
- Not specifying frame bounds: default frame may include more rows than intended

## When to Apply

- Need to rank, deduplicate, or number rows within groups
- Computing running totals, moving averages, or period-over-period comparisons
- Finding the first/last/nth value within a partition
- Any calculation that needs both detail rows and aggregate context simultaneously
