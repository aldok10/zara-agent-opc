---
type: example
title: "Example: Stakeholder Analysis -- CRM Migration Project"
---

# Example: Stakeholder Analysis -- CRM Migration Project

## Project Context

Migrating from legacy CRM (on-premise) to cloud-based CRM for a 200-person sales organization.

---

## Stakeholder Register

| # | Name/Role | Organization | Power | Interest | Current | Target | Risk |
|---|-----------|-------------|-------|----------|---------|--------|------|
| 1 | VP Sales | Sales | High | High | Supportive | Champion | None |
| 2 | CFO | Finance | High | Medium | Neutral | Supportive | Cost overrun concern |
| 3 | CTO | Technology | High | High | Champion | Champion | None |
| 4 | Sales Managers (8) | Sales | Medium | High | Mixed | Supportive | Change resistance |
| 5 | Sales Reps (150+) | Sales | Low | High | Resistant | Neutral | Productivity dip |
| 6 | IT Operations | Technology | Medium | High | Supportive | Supportive | Workload concern |
| 7 | Data/BI Team | Analytics | Medium | Medium | Neutral | Supportive | Reporting disruption |
| 8 | Legal/Compliance | Legal | Medium | Low | Unaware | Neutral | Data residency |
| 9 | Customer Success | CS | Low | Medium | Unaware | Informed | Shared data |
| 10 | External Vendor | Vendor | Low | High | Supportive | Supportive | Implementation quality |

---

## Power/Interest Grid

```
HIGH POWER
  |
  |  [CFO]              [VP Sales] [CTO]
  |  [Legal]            [Sales Managers]
  |
  |-----------------------------------------
  |
  |  [Cust. Success]   [Sales Reps] [IT Ops]
  |                     [Data/BI] [Vendor]
  |
LOW POWER
      LOW INTEREST            HIGH INTEREST
```

---

## Engagement Strategies

### VP Sales (Champion)

- **Goal**: Maintain championship, use as advocate
- **Approach**: Monthly progress briefings, share early wins, ask to communicate vision to managers
- **Risk**: Loses patience if timeline slips

### CFO (Neutral -> Supportive)

- **Goal**: Secure budget confidence
- **Approach**: Quarterly ROI updates, clear cost tracking, highlight efficiency gains
- **Trigger concern**: Any scope or budget expansion
- **Message framing**: Cost savings, productivity ROI, TCO comparison

### Sales Managers (Mixed -> Supportive)

- **Goal**: Convert to local champions for their teams
- **Approach**: Involve in workflow design, give them early access, address "what's in it for my team"
- **Resistance source**: Fear of visibility into their team's activities, learning curve
- **Tactic**: Identify 2-3 early adopters, make them peer advocates

### Sales Reps (Resistant -> Neutral)

- **Goal**: Minimize productivity disruption, achieve adoption
- **Approach**: Training program, hypercare support period, acknowledge the disruption
- **Resistance source**: Comfortable with current tool, fear of data loss, time investment
- **Tactic**: Show data migration quality, provide sandbox environment, offer 1:1 support

### Legal/Compliance (Unaware -> Neutral)

- **Goal**: No surprises, timely sign-off
- **Approach**: Early briefing on data handling, involve in vendor security review
- **Risk**: Late discovery of compliance requirement derails timeline

---

## Communication Plan

| Stakeholder | Channel | Frequency | Content | Owner |
|-------------|---------|-----------|---------|-------|
| VP Sales | 1:1 | Bi-weekly | Progress, blockers, decisions | PM |
| CFO | Email + quarterly deck | Monthly | Budget, ROI, timeline | PM + Finance |
| CTO | Standup + architecture review | Weekly | Technical progress | Tech Lead |
| Sales Managers | Team meeting | Bi-weekly | Features, training schedule, feedback | BA |
| Sales Reps | Newsletter + demo | Per milestone | What's changing, training dates | Change Lead |
| IT Ops | Standup | Daily (during migration) | Tasks, environments, issues | Tech Lead |
| Data/BI | Sync meeting | Bi-weekly | Schema changes, report migration | Data Lead |
| Legal | Briefing | 2x total (start + pre-go-live) | Compliance, data handling | PM |

---

## Key Risks from Stakeholder Dynamics

| Risk | Source | Mitigation |
|------|--------|-----------|
| Budget pulled | CFO sees costs rise | Proactive cost communication, phase delivery for early value |
| Adoption failure | Sales reps refuse new tool | Training investment, hypercare, manager accountability |
| Timeline slip from compliance | Legal discovers issue late | Engage Legal in week 2, not week 20 |
| Data quality concerns | BI team can't reproduce reports | Parallel run period, involve BI in migration validation |

---

## RACI for Key Decisions

| Decision | R | A | C | I |
|----------|---|---|---|---|
| Vendor selection | CTO | VP Sales | CFO, IT Ops | All |
| Data migration approach | Tech Lead | CTO | Data/BI, Legal | Sales Mgrs |
| Go-live date | PM | VP Sales | CTO, Sales Mgrs | All |
| Training approach | Change Lead | VP Sales | Sales Mgrs | Sales Reps |
| Cutover vs. parallel run | Tech Lead | CTO | VP Sales, IT Ops | All |
