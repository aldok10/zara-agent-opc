# JQL Reference

## Operators

| Operator | Use | Example |
|----------|-----|---------|
| `=` | Exact match | `status = Done` |
| `!=` | Not equal | `assignee != currentUser()` |
| `in` | Multiple values | `status in ("To Do", "In Progress")` |
| `not in` | Exclude multiple | `priority not in (Low, Lowest)` |
| `~` | Contains (text) | `summary ~ "payment"` |
| `!~` | Not contains | `description !~ "test"` |
| `>` `<` `>=` `<=` | Comparison | `created >= -7d` |
| `is` | Empty check | `assignee is EMPTY` |
| `is not` | Not empty | `fixVersion is not EMPTY` |
| `was` | Historical | `status was "In Progress"` |
| `changed` | Field change | `status changed TO Done AFTER -1w` |

## Functions

| Function | Returns |
|----------|---------|
| `currentUser()` | Logged-in user |
| `membersOf("group")` | Group members |
| `openSprints()` | Active sprints |
| `closedSprints()` | Completed sprints |
| `futureSprints()` | Planned sprints |
| `startOfDay()` / `endOfDay()` | Day boundaries |
| `startOfWeek()` / `startOfMonth()` | Period starts |
| `now()` | Current timestamp |
| `updatedBy(user)` | Issues updated by user |
| `linkedIssues(key, linkType)` | Linked issues |

## Date Syntax

| Expression | Meaning |
|------------|---------|
| `-7d` | 7 days ago |
| `-1w` | 1 week ago |
| `-2h` | 2 hours ago |
| `"2024-01-15"` | Specific date |
| `startOfMonth(-1)` | Start of last month |
| `endOfWeek()` | End of current week |

## Keywords

`AND`, `OR`, `NOT`, `ORDER BY`, `ASC`, `DESC`, `EMPTY`, `NULL`

## Field References

| Field | JQL Name |
|-------|----------|
| Custom field | `cf[10200]` or `"Custom Field Name"` |
| Story points | `"Story Points"` or `cf[10002]` |
| Sprint | `sprint` |
| Epic Link | `"Epic Link"` |
| Fix Version | `fixVersion` |
| Affected Version | `affectedVersion` |
| Resolution Date | `resolutiondate` |
| Labels | `labels` |
| Components | `component` |

## Text Search

- `~` for contains: `summary ~ "login"`
- `~` with wildcard: `summary ~ "pay*"`
- Exact phrase: `summary ~ "\"exact phrase\""`
- Fuzzy: `summary ~ "paymnt~"` (typo tolerance)

## Atlassian Intelligence / Natural-Language JQL

Jira Cloud supports natural-language→JQL via Atlassian Intelligence (2024+). Type plain English in the search bar; AI converts to JQL. Works best with clear intent + entity names.

Limitations: requires Cloud Premium/Enterprise, workspace admin must enable AI. Not available on Data Center.

## Advanced Patterns (2025)

| Pattern | JQL |
|---------|-----|
| Completed last week | `status changed TO "Done" AFTER -1w` |
| Work logged this week | `worklogDate >= startOfWeek()` |
| Blocking issues unresolved | `issueLinkType = "blocks" AND status != Done` |
| My open bugs this sprint | `assignee = currentUser() AND type = Bug AND sprint in openSprints() AND status != Done` |
| Stale in-progress (>14d) | `status = "In Progress" AND status changed TO "In Progress" BEFORE -14d` |
| Recently resolved by team | `resolved >= -7d AND assignee in membersOf("dev-team")` |

## Functions (2025 additions)

| Function | Returns |
|----------|---------|
| `issueHistory(field, from, to)` | Issues where field changed between values |
| `approver()` | Current approver (JSM) |
| `organizationUser()` | Users in customer org (JSM) |
| `worklogAuthor(user)` | Issues with worklogs by user |
