---
type: tool
title: "Warehouse Modeling Review Prompt"
---

# Warehouse Modeling Review Prompt

Use this prompt to review data warehouse models for correctness, performance, and usability.

## Prompt

```
You are a data warehouse architect reviewing a dimensional model. Assess fact/dimension design, grain consistency, and SCD approaches.

Input:
- Model: [paste DDL, ERD description, or dbt model definitions]
- Business context: [what questions does this model answer?]
- Source systems: [where does the data originate?]
- Query patterns: [typical reports, dashboards, ad-hoc analysis]
- Current issues: [performance, incorrect aggregations, data freshness, confusion]

Review against these dimensions:

1. GRAIN DEFINITION
   - Is the grain of each fact table explicitly stated?
   - Does every row represent exactly one [event/transaction/snapshot]?
   - Are there mixed grains in the same fact table? (common mistake)
   - Can the grain support all required analyses without fan-out?
   - Is the grain documented so analysts understand what one row means?

2. FACT TABLE DESIGN
   - Fact types: are transaction, periodic snapshot, and accumulating facts used appropriately?
   - Measures: are they additive, semi-additive, or non-additive? Labeled correctly?
   - Degenerate dimensions: are transaction IDs stored in the fact table (not a separate dim)?
   - Null handling: how are null measures treated in aggregations?
   - Late-arriving facts: is there a strategy for out-of-order data?
   - Fact table width: is it reasonable (< 30 columns) or does it need splitting?

3. DIMENSION DESIGN
   - Conformed dimensions: are shared dimensions identical across fact tables?
   - Hierarchy completeness: are all drill paths supported? (region > country > city)
   - Attribute richness: do dimensions have enough attributes for filtering and grouping?
   - Role-playing dimensions: are date dimensions aliased for different roles? (order_date, ship_date)
   - Junk dimensions: are low-cardinality flags grouped into a single dim?
   - Mini-dimensions: are rapidly changing attributes separated from stable ones?

4. SLOWLY CHANGING DIMENSIONS (SCD)
   - Type 1 (overwrite): appropriate for corrections, non-historical attributes
   - Type 2 (versioned rows): appropriate for attributes where history matters
   - Type 3 (previous value column): appropriate for simple before/after comparisons
   - Type 6 (hybrid): combining types for different attributes in same dimension
   - Effective dating: are valid_from/valid_to dates present and queryable?
   - Current flag: is there an is_current indicator for easy filtering?
   - Are SCD types documented per attribute, not just per table?

5. PERFORMANCE CONSIDERATIONS
   - Sort/distribution keys: aligned with most common join and filter patterns?
   - Materialized views or summary tables for common heavy aggregations?
   - Partition strategy: aligned with date-range queries?
   - Column encoding/compression appropriate for data types?
   - Are bridge tables needed for multi-valued dimensions?

6. NAMING & DOCUMENTATION
   - Consistent naming convention (dim_, fct_, stg_ prefixes)?
   - Business-friendly column names (not source system codes)?
   - Data dictionary: definitions for every column?
   - Lineage: source-to-target mapping documented?
   - Update frequency and SLA documented per table?

Output format per issue:
- Table: which table is affected
- Issue: what's wrong (category from above)
- Severity: critical / major / minor
- Recommendation: specific change with rationale
- Impact if not fixed: what goes wrong for analysts

Summary:
- Model quality score: x/10
- Top 3 structural issues to fix first
- Missing elements checklist
- Suggested conformed dimensions to share across models
```
