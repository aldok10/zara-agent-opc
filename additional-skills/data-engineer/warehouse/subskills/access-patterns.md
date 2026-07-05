---
type: subskill
title: "Access Patterns"
---

# Access Patterns

## Core Concepts

- Access patterns describe how consumers query data: which columns, which filters, what granularity
- Warehouse design must optimize for actual access patterns, not hypothetical ones
- Read-heavy patterns favor denormalization; write-heavy patterns favor normalization
- Different consumers (analysts, dashboards, ML models) have fundamentally different patterns
- Star/snowflake schemas optimize for known dimensional query patterns

## Key Practices

- Catalog actual queries: examine query logs to discover real access patterns before designing
- Denormalize for frequent joins: pre-join dimension tables into fact tables for dashboard speed
- Create purpose-specific tables (wide tables, summary tables) for different consumer types
- Align sort/cluster keys with the most common filter and group-by columns
- Separate serving layers by SLA: real-time dashboards vs ad-hoc exploration vs batch reports

## Common Mistakes

- Designing warehouse schemas without studying how data will actually be queried
- One-size-fits-all: same table structure serving sub-second dashboards and exploratory queries
- Over-normalizing in an analytical warehouse — joins at query time kill dashboard performance

## When to Apply

- Designing a new data warehouse or mart from scratch
- Query performance is poor despite adequate infrastructure
- Adding a new consumer type (ML, real-time dashboard) to existing warehouse
- Planning warehouse refresh: need to decide which tables to materialize and how to organize
