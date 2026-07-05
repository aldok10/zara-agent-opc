---
type: fact
title: "Dimensional Modeling"
---

# Dimensional Modeling

## Kimball Methodology

### Core Philosophy
- Design for query performance and business user understandability
- Bottom-up approach: build dimensional models per business process
- "Publish or perish": deliver usable data marts quickly
- The bus architecture: conformed dimensions connect facts across processes

### Four-Step Design Process
1. Select the business process (e.g., sales, shipments, claims)
2. Declare the grain (one row represents what?)
3. Identify dimensions (who, what, where, when, why, how)
4. Identify facts (measurable numeric values at that grain)

### Grain Declaration
- Most critical decision in dimensional modeling
- Express as: "one row per [transaction/event/snapshot] per [entity] per [time period]"
- Examples:
  - "One row per line item per order"
  - "One row per daily account balance"
  - "One row per click event"
- Finer grain = more flexibility for aggregation
- Never mix grains in a single fact table

## Schema Patterns

### Star Schema
- Central fact table surrounded by denormalized dimension tables
- Single join between fact and each dimension
- Optimized for: query simplicity, BI tool compatibility, scan performance
- Trade-off: storage redundancy in dimensions (acceptable)

### Snowflake Schema
- Dimensions normalized into sub-dimensions (e.g., product → category → department)
- Saves storage but adds join complexity
- Use when: dimension is very large and rarely joined at full depth
- Generally avoided in Kimball methodology (prefer star)

### When to Snowflake
- Very high cardinality dimensions (millions of rows with repeated hierarchies)
- Slowly changing dimension tracking at different hierarchy levels
- Explicit requirement for normalized reporting structures

## Fact Table Types

### Transaction Facts
- One row per event at atomic grain
- Most flexible and detailed
- Examples: orders, clicks, calls, payments
- Additivity: facts sum across all dimensions

### Periodic Snapshot Facts
- One row per entity per time period
- Captures cumulative state at regular intervals
- Examples: daily account balance, weekly inventory levels, monthly ARR
- Semi-additive: can't sum across time (average instead), can sum across other dimensions

### Accumulating Snapshot Facts
- One row per entity lifecycle (e.g., one row per order)
- Multiple date columns tracking milestones (ordered, shipped, delivered, returned)
- Updated as entity progresses through pipeline
- Good for: process monitoring, SLA tracking, funnel analysis

### Factless Fact Tables
- Record events with no measurable numeric value
- Examples: student attendance, product promotions, coverage relationships
- Useful for: "what didn't happen" queries (anti-join against events)

## Slowly Changing Dimensions (SCD)

### Type 1: Overwrite
- Replace old value with new value
- No history preserved
- Use when: corrections, non-meaningful changes
- Example: fix a misspelled customer name

### Type 2: Add New Row
- Insert new row with new surrogate key, effective/expiration dates, current flag
- Full history preserved
- Most common approach for business-meaningful changes
- Example: customer moves to new city (old row expires, new row becomes current)

```
| surrogate_key | customer_id | city      | effective_date | expiry_date | is_current |
|---------------|-------------|-----------|----------------|-------------|------------|
| 1001          | C-42        | Jakarta   | 2020-01-01     | 2024-06-15  | false      |
| 1002          | C-42        | Singapore | 2024-06-15     | 9999-12-31  | true       |
```

### Type 3: Add New Column
- Previous value stored in separate column
- Limited history (only one prior value)
- Use when: need before/after comparison
- Example: `current_region` and `previous_region` columns

### Type 6 (Hybrid): 1 + 2 + 3
- Combines Type 2 rows with Type 3 current-value column
- Every row has both historical context and current value
- Enables grouping by either historical or current attribute

### Type 0: Retain Original
- Never change the dimension value
- Use for: original assignment (first sales rep, signup source)

## Conformed Dimensions

### Purpose
- Shared dimensions used identically across multiple fact tables
- Enable cross-process analysis: join sales facts and inventory facts on same product dimension
- Single source of truth for entity attributes

### Design Rules
- Identical grain, keys, and attributes across all uses
- Maintained by single team, published as shared asset
- Subset (smaller version) is acceptable; superset is not
- Common conformed dimensions: date, customer, product, geography, employee

### Date Dimension
- Pre-built table with one row per day (10 years = ~3,650 rows)
- Attributes: day_of_week, month_name, quarter, fiscal_year, is_holiday, is_weekend
- Enables calendar-based filtering without date functions in queries
- Special rows: unknown date (surrogate key = -1), not applicable

## Advanced Patterns

### Junk Dimensions
- Group low-cardinality flags and indicators into one dimension
- Avoids polluting fact table with many boolean/flag columns
- Example: combine `is_rush_order`, `payment_type`, `gift_wrap` into single dimension
- Pre-populate all valid combinations

### Degenerate Dimensions
- Dimension key stored in fact table with no corresponding dimension table
- Examples: order_number, invoice_id, transaction_id
- The "dimension" is just a grouping key, no additional attributes needed

### Role-Playing Dimensions
- Same dimension used multiple times in one fact table with different meanings
- Example: date dimension as `order_date_key`, `ship_date_key`, `delivery_date_key`
- Implemented as views/aliases pointing to same base dimension

### Bridge Tables
- Handle many-to-many relationships between fact and dimension
- Example: multiple diagnoses per patient visit, multiple authors per paper
- Weighting factor column to allow correct aggregation

## Implementation with dbt

### Modeling Layer Mapping
- Staging: 1:1 with source tables, cleaned and typed
- Intermediate: business logic, deduplication, joining
- Marts: final dimensional model (facts and dimensions)

### Surrogate Keys
- Generate with `dbt_utils.generate_surrogate_key(['natural_key_1', 'natural_key_2'])`
- Stable hash-based keys, deterministic across runs
- Prefer over auto-increment for idempotent loads

### SCD Type 2 in dbt
- Use `dbt-snapshot` for Type 2 tracking
- Configure: `strategy='check'` (hash of tracked columns) or `strategy='timestamp'`
- Snapshot tables maintain `dbt_valid_from`, `dbt_valid_to` columns
