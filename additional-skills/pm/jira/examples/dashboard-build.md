---
type: example
title: "Example: Sprint Health Dashboard"
---

# Example: Sprint Health Dashboard

## Question Answered
"Will we finish this sprint on time?"

## Gadgets (4)

### 1. Sprint Burndown
Filter: N/A (board-native)
Shows: remaining work vs ideal line

### 2. Remaining by Assignee
Filter: `sprint in openSprints() AND status != Done AND project = PROJ`
Type: Pie chart by assignee
Shows: workload distribution, overloaded members

### 3. Blocked Items
Filter: `sprint in openSprints() AND (flagged = impediment OR status = Blocked)`
Type: Filter results (list)
Shows: items needing unblock action

### 4. Scope Change
Filter: `sprint in openSprints() AND created >= sprintStartDate`
Type: Created vs Resolved + count
Shows: items added mid-sprint (scope creep indicator)

## Sharing
- Team: Edit (can add personal gadgets)
- PM: View
- Stakeholders: Not shared (use Stakeholder Overview instead)

## Verification
- [ ] Loads <3s
- [ ] All filters return current sprint data
- [ ] Can answer "will we finish?" in <10s of scanning
- [ ] No stale data (test after sprint transition)
