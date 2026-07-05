# Triage Session Example

Processing 10 inbox items. Decision time target: <2 min total.

## Items Processed

| # | Issue | Decision | Priority | Assignee | Reasoning |
|---|-------|----------|----------|----------|-----------|
| 1 | "API 500 on /payments" | Assign to cycle | Urgent | @oncall | Production, revenue impact |
| 2 | "Add dark mode toggle" | Backlog | Low | — | Nice-to-have, no user demand signal |
| 3 | "Login broken on Safari" | Assign to cycle | High | @frontend-lead | Blocks users, browser-specific |
| 4 | "Refactor auth module" | Backlog | Medium | — | Tech debt, no immediate risk |
| 5 | "Duplicate of #342" | Decline (close) | — | — | Linked to original, closed |
| 6 | "Vague: make it faster" | Decline (needs info) | — | — | Commented asking for specifics, snoozed 3d |
| 7 | "Webhook fails silently" | Assign to cycle | High | @backend | Data loss risk, customer reported |
| 8 | "Update footer links" | Backlog | Low | — | Cosmetic, no urgency |
| 9 | "GDPR data export" | Next cycle | Medium | @backend | Compliance, not blocking yet |
| 10 | "Mobile nav overlap" | Backlog | Medium | — | Visual bug, workaround exists |

## Result

- Assigned to current cycle: 3 (items 1, 3, 7)
- Backlog: 4 (items 2, 4, 8, 10)
- Next cycle: 1 (item 9)
- Declined: 2 (items 5, 6)
- Inbox: 0
