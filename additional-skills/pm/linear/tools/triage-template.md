---
type: tool
title: "Triage Decision Template"
---

# Triage Decision Template

Use for each inbox item. Target: <10 seconds per decision.

## Priority Matrix

| Impact \ Urgency | Blocks users NOW | Blocks users SOON | Doesn't block |
|------------------|-----------------|-------------------|---------------|
| Revenue/data | Urgent | High | Medium |
| UX/workflow | High | Medium | Low |
| Cosmetic/internal | Medium | Low | Low |

## Routing Rules

1. **Urgent** → Assign immediately, add to active cycle, notify team lead.
2. **High** → Assign same day, add to current cycle if capacity allows.
3. **Medium** → Backlog, schedule within 2 cycles.
4. **Low** → Backlog, no SLA.
5. **Decline** → Duplicate (close+link), unclear (comment+snooze 3d), out-of-scope (transfer).

## Decision Prompt

For each issue ask:
- Who is impacted? (users / internal / nobody yet)
- What breaks if we ignore this 2 weeks? (data loss / bad UX / nothing)
- Is there a workaround? (yes = lower priority)
- Customer-reported? (auto-bump to High minimum)

## Output per Item

`[Priority] [Assignee] [Cycle: current|next|backlog] [Reason: 5 words max]`
