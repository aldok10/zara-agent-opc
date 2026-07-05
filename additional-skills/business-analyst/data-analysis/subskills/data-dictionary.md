---
type: subskill
title: "Data Dictionary"
---

# Data Dictionary

Field specifications, data types, constraints, and lineage documentation.

## When to Load

- Documenting database schemas or API payloads
- Standardizing field naming and typing conventions
- Tracking data lineage across systems
- Onboarding new team members to the data model

## Key Concepts

**Field Specification** -- Complete definition of a data element: name, type, length/precision, constraints, description, example value, source system.

**Naming Conventions** -- Consistent patterns: snake_case vs camelCase, prefix conventions (is_/has_ for booleans, _at for timestamps, _id for references), abbreviation rules.

**Constraints** -- NOT NULL, UNIQUE, CHECK, DEFAULT, foreign key references. Document both database-level and application-level validation rules.

**Data Lineage** -- Where does this field originate? What transforms it? Where is it consumed? Critical for debugging data quality issues and impact analysis.

**Business Rules** -- Logic that governs valid values beyond type constraints. "discount_percent must be 0-100", "end_date must be after start_date", "status transitions: draft->active->archived only".

## Patterns

```markdown
# Order Entity - Data Dictionary

| Field | Type | Constraints | Description | Example |
|-------|------|-------------|-------------|---------|
| id | UUID | PK, NOT NULL | Unique order identifier | `ord_a1b2c3d4` |
| customer_id | UUID | FK(customers.id), NOT NULL | Ordering customer | `cust_x9y8z7` |
| status | ENUM | NOT NULL, DEFAULT 'draft' | Order lifecycle state | `confirmed` |
| total_amount | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | Total including tax | `149.99` |
| currency | CHAR(3) | NOT NULL, ISO 4217 | Three-letter currency code | `USD` |
| placed_at | TIMESTAMPTZ | NULL until confirmed | When order was confirmed | `2024-03-15T10:30:00Z` |
| cancelled_at | TIMESTAMPTZ | NULL | When order was cancelled | `null` |
| notes | TEXT | NULL, max 2000 chars | Customer-provided notes | `"Leave at door"` |

## Status Values
| Value | Description | Transitions To |
|-------|-------------|----------------|
| draft | Order being assembled | confirmed, cancelled |
| confirmed | Payment accepted | shipped, cancelled |
| shipped | In transit | delivered, returned |
| delivered | Successfully received | returned |
| cancelled | Order cancelled | (terminal) |
| returned | Items returned | (terminal) |

## Lineage
- `total_amount`: Calculated from SUM(order_items.quantity * order_items.unit_price) + tax
- `status`: Updated by OrderService, triggers events consumed by NotificationService and AnalyticsService
- `placed_at`: Set by ConfirmOrderCommand when payment succeeds
```

```yaml
# Machine-readable data dictionary (for automation)
entities:
  order:
    description: "Customer purchase transaction"
    owner: order-team
    fields:
      id:
        type: uuid
        generated: true
        format: "ord_{nanoid}"
      status:
        type: enum
        values: [draft, confirmed, shipped, delivered, cancelled, returned]
        default: draft
        transitions:
          draft: [confirmed, cancelled]
          confirmed: [shipped, cancelled]
          shipped: [delivered, returned]
```

## Gotchas

- Data dictionaries without maintenance ownership go stale within months
- Documenting only the database and missing API-layer transformations leaves gaps
- Generic descriptions ("the order total") add no value -- be specific about calculation logic
- Missing example values force readers to guess valid formats
- Not documenting NULL semantics (does NULL mean "unknown", "not applicable", or "not yet set"?)

## Verification

- Every field has: name, type, constraints, description, and example
- Enum fields list all valid values with descriptions
- Calculated fields document their formula and source fields
- NULL semantics are explicitly documented (what does NULL mean for this field?)
- Dictionary matches current schema (automate comparison if possible)
