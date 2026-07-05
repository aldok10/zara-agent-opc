# Triage Workflow

## Purpose

Process Linear inbox to zero daily. Every issue: prioritize, assign, or decline.

## Daily Triage Checklist

1. Open inbox (Cmd+I). Sort by created date.
2. For each issue:
   - Read title + description (5 sec max decision)
   - Assign priority (see matrix below)
   - Assign team + owner
   - Set cycle if priority Urgent/High
   - Decline if duplicate, unclear, or out-of-scope
3. Process notifications: respond, archive, or snooze.
4. Verify: inbox = 0.

## Priority Definitions

| Priority | Criteria | SLA |
|----------|----------|-----|
| Urgent | Production down, data loss, security breach | Assign within 1h, resolve <24h |
| High | Blocks users, revenue impact, committed deadline | Assign same day, resolve within cycle |
| Medium | Improves experience, tech debt with risk | Schedule within 2 cycles |
| Low | Nice-to-have, minor improvements | Backlog, no SLA |
| No Priority | Untriaged. Must not persist >24h | Triage same day |

## Auto-Routing Rules

- Bug + "production" label → Priority Urgent, on-call team
- Customer-reported → Priority High minimum, tag customer-success
- Has PR linked → Assign PR author, set In Progress
- Created by bot/integration → Low priority unless error/alert

## Escalation Triggers

- Urgent issue unassigned >1h → Slack alert to team lead
- High priority unassigned >4h → Escalate to EM
- Issue reassigned >2 times → Flag for scope clarification
- Blocked status >3 days → Surface in standup

## Decline Criteria

- Duplicate of existing issue (link + close)
- No clear problem statement (comment asking for clarity, snooze 3 days)
- Out of team scope (transfer to correct team)
- Won't fix (label, close with reason)

## Verification

- [ ] Inbox = 0
- [ ] All Urgent/High assigned with cycle
- [ ] No issue without priority persists >24h
- [ ] Declined issues have comment explaining why
