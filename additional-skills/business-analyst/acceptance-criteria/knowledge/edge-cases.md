---
type: fact
title: "Edge Cases and Boundary Analysis"
---

# Edge Cases and Boundary Analysis

## What Are Edge Cases?

Edge cases are inputs or conditions at the boundaries of expected behavior. They reveal assumptions that developers make but don't explicitly handle.

## Boundary Analysis Framework

### Numeric Boundaries

For any numeric input, test:
- Minimum valid value
- One below minimum (invalid)
- Maximum valid value
- One above maximum (invalid)
- Zero (often a special case)
- Negative values (if applicable)
- Very large numbers (overflow)
- Decimal precision limits

### String Boundaries

- Empty string ("")
- Single character
- Maximum length
- Maximum length + 1
- Unicode characters (emoji, RTL, CJK)
- Special characters (quotes, backslashes, null bytes)
- Whitespace only
- Leading/trailing whitespace
- Very long strings (buffer limits)

### Collection Boundaries

- Empty collection
- Single item
- Maximum allowed items
- Duplicate items
- Items in unexpected order

## Error Conditions

### Network Errors
- Connection timeout
- Partial response
- DNS failure
- SSL certificate expired
- Rate limit exceeded (429)
- Service unavailable (503)

### Data Errors
- Malformed input (wrong type, missing fields)
- Stale data (concurrent modification)
- Referential integrity (deleted parent)
- Encoding issues (UTF-8 vs Latin-1)

### Authorization Errors
- Expired token
- Insufficient permissions
- Revoked access mid-operation
- Multi-tenant data leakage

## Empty States

Every feature should define behavior for:
- First-time user (no data exists)
- All items deleted (data existed, now empty)
- Search returns no results
- Filter excludes everything
- Pagination with zero results
- Dashboard with no activity

## Timing and Concurrency

- Double-click / double-submit
- Operation during maintenance window
- Clock skew between services
- Race condition: two users edit same record
- Timeout during long-running operation
- Retry after partial completion

## State Transitions

For each state machine:
- Can the entity reach every defined state?
- What happens on invalid transitions?
- Can an entity get stuck in a state?
- What about re-entry to a previous state?
- Concurrent transition attempts?

## Checklist for Edge Case Discovery

1. What are the input boundaries?
2. What if the input is empty or missing?
3. What if the operation is performed twice?
4. What if a dependency is unavailable?
5. What if permissions change mid-flow?
6. What happens at midnight / month-end / year-end?
7. What if the user cancels mid-operation?
8. What if data was created by an older version?
9. What about the first and last items?
10. What if another user modifies the same data?

## Prioritizing Edge Cases

| Priority | Category | Example |
|----------|----------|---------|
| P0 | Data loss | Concurrent save overwrites |
| P0 | Security | Permission bypass |
| P1 | Money | Double charge |
| P1 | Data integrity | Orphaned records |
| P2 | UX degradation | Empty state shows error |
| P3 | Cosmetic | Long name truncation |
