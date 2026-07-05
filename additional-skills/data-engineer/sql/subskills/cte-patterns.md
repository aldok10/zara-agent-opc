---
type: subskill
title: "CTE Patterns"
---

# CTE Patterns

## Core Concepts

- CTEs (Common Table Expressions) create named, reusable result sets within a single query
- They improve readability by breaking complex logic into named steps
- Non-recursive CTEs are syntactic: the optimizer may inline or materialize them
- Recursive CTEs traverse hierarchical data (org charts, category trees, graph paths)
- CTEs can be chained: each CTE can reference any previously defined CTE

## Key Practices

- Use CTEs to name intermediate transformations: raw -> filtered -> aggregated -> final
- Recursive CTEs: define base case UNION ALL recursive step with termination condition
- Materialize CTEs explicitly (where supported) when referenced multiple times to avoid recomputation
- Keep each CTE focused on one transformation — name it for what it produces
- Use CTEs over nested subqueries for anything beyond two levels of nesting

## Common Mistakes

- Assuming CTEs are always materialized — in most engines they're inlined (can re-execute)
- Infinite recursion: forgetting the WHERE clause that terminates recursive CTEs
- Using CTEs where a simple JOIN suffices — added syntax without added clarity

## When to Apply

- Query logic requires multiple transformation steps that are hard to follow inline
- Traversing hierarchical or graph-structured data in SQL
- Building complex reports where intermediate results are referenced multiple times
- Refactoring deeply nested subqueries into readable, maintainable form
