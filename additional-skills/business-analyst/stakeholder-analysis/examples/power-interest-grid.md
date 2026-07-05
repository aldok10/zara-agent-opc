---
type: example
title: "Power/Interest Grid for Platform Migration"
---

# Power/Interest Grid for Platform Migration

## Context
When planning stakeholder engagement for a major initiative (platform migration, system rewrite, org restructure). The power/interest grid determines communication frequency, involvement level, and potential blockers.

## Code/Template

### Project: Legacy Monolith → Microservices Migration

```
                        HIGH POWER
                            │
         KEEP SATISFIED     │     MANAGE CLOSELY
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
    │  • CFO               │  • CTO                │
    │  • Legal/Compliance   │  • VP Engineering     │
    │  • Board (sponsor)    │  • Product Director   │
    │                       │  • Platform Team Lead  │
    │                       │                       │
    │                       │                       │
────┼───────────────────────┼───────────────────────┼────
    │                       │                       │  HIGH
    │  MONITOR              │  KEEP INFORMED        │  INTEREST
    │  (Minimal Effort)     │                       │
    │                       │                       │
    │  • External auditors  │  • Backend engineers  │
    │  • HR                 │  • DevOps/SRE team    │
    │  • Marketing          │  • QA team            │
    │  • Sales team         │  • Frontend engineers │
    │                       │  • Customer support   │
    │                       │                       │
    └───────────────────────┼───────────────────────┘
                            │
                        LOW POWER
```

### Stakeholder Register

| Stakeholder | Power | Interest | Quadrant | Engagement Strategy |
|-------------|-------|----------|----------|-------------------|
| CTO | High | High | Manage Closely | Weekly 1:1, decision authority on architecture |
| VP Engineering | High | High | Manage Closely | Steering committee member, bi-weekly updates |
| Product Director | High | High | Manage Closely | Feature freeze negotiation, roadmap alignment |
| Platform Team Lead | Medium | High | Manage Closely | Daily involvement, technical decisions |
| CFO | High | Low | Keep Satisfied | Monthly cost/ROI reports, budget approval gates |
| Legal/Compliance | High | Low | Keep Satisfied | Quarterly check-in, data residency sign-off |
| Board Sponsor | High | Low | Keep Satisfied | Quarterly exec summary, escalation path |
| Backend Engineers | Low | High | Keep Informed | Sprint demos, migration guides, training |
| DevOps/SRE | Medium | High | Keep Informed | Architecture reviews, runbook updates |
| QA Team | Low | High | Keep Informed | Test strategy workshops, environment access |
| Frontend Engineers | Low | Medium | Keep Informed | API contract changes, timeline awareness |
| Customer Support | Low | Medium | Keep Informed | Impact briefing before cutover |
| External Auditors | Low | Low | Monitor | Annual compliance report |
| HR | Low | Low | Monitor | Staffing changes only if needed |
| Marketing | Low | Low | Monitor | Notify only for customer-facing changes |
| Sales Team | Low | Low | Monitor | Brief on any feature parity gaps |

### Communication Plan

| Quadrant | Frequency | Channel | Content |
|----------|-----------|---------|---------|
| Manage Closely | Weekly | Steering meeting + Slack DM | Decisions needed, risks, blockers, progress |
| Keep Satisfied | Monthly | Email report + quarterly meeting | Budget burn, timeline, high-level milestones |
| Keep Informed | Bi-weekly | Team newsletter + sprint demos | What changed, what's coming, how it affects them |
| Monitor | As needed | Email announcement | Only material changes or required actions |

### Risk Assessment by Stakeholder

| Stakeholder | Risk if Disengaged | Mitigation |
|-------------|-------------------|------------|
| CTO | Architecture decisions made without alignment | Standing weekly, async decision log |
| CFO | Budget pulled mid-migration | Monthly ROI tracking, early warning at 80% burn |
| Product Director | Feature requests conflict with migration work | Shared backlog, capacity allocation agreement |
| Backend Engineers | Resistance to new patterns, shadow workarounds | Involve in design, pair programming, celebrate early wins |
| Customer Support | Surprised by behavior changes, poor customer experience | Pre-cutover briefing, runbook for new error patterns |

### Influence Map (Key Relationships)

```
Board Sponsor ──advocates──→ CFO (budget approval)
       │
       └──empowers──→ CTO ──directs──→ VP Engineering
                                            │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                      Platform Lead    DevOps/SRE    Backend Engineers
                              │
                              └──depends on──→ Product Director
                                              (feature freeze windows)
```

### Action Items

1. **Immediate**: Schedule CTO alignment meeting to confirm architecture principles
2. **Week 1**: Secure CFO sign-off on 18-month budget with quarterly gates
3. **Week 2**: Hold Product/Engineering capacity split negotiation (70/30 proposed)
4. **Week 3**: Launch migration newsletter for Keep Informed group
5. **Ongoing**: Monthly stakeholder grid review — power/interest shifts as project progresses

## Key Points
- The grid is dynamic: a stakeholder's position changes over phases. Backend engineers move to "Manage Closely" during cutover week. Re-assess quarterly.
- "Keep Satisfied" stakeholders (CFO, Legal) are the most common blockers when surprised. Proactive monthly updates prevent last-minute budget or compliance blocks.
- Map influence relationships, not just individual positions. The CTO's support means nothing if the Product Director is blocking feature freezes needed for migration work.
