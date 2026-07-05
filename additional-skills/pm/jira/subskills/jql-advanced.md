# JQL Advanced

## Scope

Complex queries, custom field filtering, relative dates, cross-project search, saved filters, bulk operations.

## Essential Patterns

### Sprint Queries
- `sprint in openSprints()` - all open sprint items
- `sprint in futureSprints()` - backlog committed to future
- `sprint = "Team-Sprint-42" AND status != Done` - remaining work
- `sprint in closedSprints() AND resolution = Unresolved` - rollover candidates

### SLA & Aging
- `created >= -7d AND status = "To Do"` - untriaged new items
- `updated <= -14d AND status != Done` - stale issues
- `status changed TO "In Progress" BEFORE -5d AND status = "In Progress"` - stuck work
- `created <= -30d AND resolution = Unresolved` - aging unresolved

### Priority & Escalation
- `priority in (Highest, High) AND status != Done AND due <= 2d` - urgent due soon
- `priority changed TO Highest AFTER -1d` - recently escalated

### Cross-Project
- `project in (PROJ1, PROJ2) AND fixVersion = "2024-Q1"` - multi-project release
- `issueLinkedTo("EPIC-123", "is blocked by")` - dependency chain

### Team & Membership
- `assignee in membersOf("backend-team")` - team workload
- `assignee was currentUser() AND status changed TO Done AFTER -7d` - my recent completions
- `reporter = currentUser() AND resolution = Unresolved` - my open requests

### Text & Custom Fields
- `summary ~ "payment*"` - wildcard text search
- `cf[10200] = "value"` - custom field by ID
- `"Story Points" >= 5 AND sprint in openSprints()` - large items in sprint

## Performance Tips

- Prefer `=` over `~` (exact faster than text search)
- Limit `ORDER BY` fields to indexed columns
- Avoid `NOT IN` on large sets; use positive filters
- `project =` before other clauses (narrows scan early)
- Save complex queries as filters; reference by ID in dashboards

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `status = "done"` (case) | `status = Done` (use exact status name) |
| `sprint = openSprints()` | `sprint in openSprints()` (function returns list) |
| Missing quotes on multi-word values | `status = "In Progress"` |
| Using `AND` when meaning `OR` for multiple values | `status in ("To Do", "In Progress")` |
| `resolved > -7d` (wrong field) | `resolutiondate >= -7d` |

## Bulk Operations

1. Run JQL to select target issues
2. Tools > Bulk Change (or select all + right-click)
3. Available: transition, edit fields, move, delete
4. Always preview before confirming. Check count matches expectation.

## Verification

Query returns expected count. Results spot-checked (3 random). No false positives in first page.
