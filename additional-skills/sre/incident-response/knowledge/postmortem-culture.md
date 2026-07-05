---
type: fact
title: "Blameless Postmortems"
---

# Blameless Postmortems

Learning from incidents without assigning individual blame. Focus: systemic causes, actionable improvements.

## Blameless Principle

People make decisions based on information available at the time. If a human made an error, the question is: what in the system allowed that error to have impact?

**Blameless ≠ accountabilityless.** Teams own follow-through on action items. The distinction: blame asks "who did this?" — accountability asks "how do we prevent this class of failure?"

## Postmortem Structure

### Required Sections

1. **Incident Summary** (2-3 sentences)
   - What happened, duration, severity, customer impact

2. **Timeline** (chronological, timestamped)
   - Detection → response → mitigation → resolution
   - Include decision points and information available at each moment

3. **Impact**
   - Users affected (count or percentage)
   - Revenue impact (if measurable)
   - SLO budget consumed
   - Data loss or integrity issues

4. **Root Cause Analysis**
   - Contributing factors (plural — incidents rarely have single root cause)
   - Use "5 Whys" or causal factor tree
   - Distinguish: trigger (what started it) vs contributing factors (why it was bad)

5. **What Went Well**
   - Detection speed, response coordination, tooling that helped
   - Reinforces good practices

6. **What Went Poorly**
   - Gaps in monitoring, slow response, unclear ownership
   - Documentation gaps, missing runbooks

7. **Action Items** (the most important section)
   - Each item: owner, priority, due date, tracking ticket
   - Categorized: prevent, detect, mitigate, process

8. **Lessons Learned**
   - Generalizable insights for other teams

## Action Item Quality

Bad action items:
- "Be more careful" (not actionable)
- "Add more monitoring" (too vague)
- "Rewrite the service" (disproportionate)

Good action items:
- "Add alert when order queue depth > 1000 for 5 minutes" (P2, @alice, by March 15)
- "Add circuit breaker to payment service → inventory call" (P1, @bob, by March 8)
- "Document rollback procedure for schema migrations" (P3, @carol, by March 22)

### Priority Framework

| Priority | Criteria | SLA |
|----------|----------|-----|
| P1 | Could cause same incident again | 1 week |
| P2 | Would reduce blast radius or detection time | 2 weeks |
| P3 | Process improvement, documentation | 1 month |
| P4 | Nice to have, low-risk gap | Next quarter |

## SLO Impact Tracking

Every postmortem should quantify SLO budget impact:

```
Error budget consumed: 45% of monthly budget (in 23 minutes)
SLO: 99.9% availability (43.8 min/month budget)
Time to recover error budget: estimated 3 weeks at current request volume
```

When an incident consumes >50% of error budget:
- Freeze non-critical deploys until budget recovers
- Prioritize reliability work over features
- Escalate follow-up items to P1

## Follow-Up Tracking

Action items without tracking rot. Implement:

1. **Tracking system**: Jira epic or GitHub project per incident
2. **Weekly review**: engineering manager reviews open items in 1:1s
3. **Monthly report**: percentage of action items completed on time
4. **Escalation**: items overdue >2 weeks flagged to director level
5. **Closure criteria**: action item done when deployed AND verified (not when PR merged)

### Health Metrics

| Metric | Healthy | Concerning |
|--------|---------|-----------|
| Action items completed on time | >80% | <60% |
| Mean time to complete P1 items | <7 days | >14 days |
| Recurring incidents (same root cause) | 0 | >1 per quarter |
| Postmortems published within SLA | >90% | <70% |

## Running the Postmortem Meeting

### Before (facilitator prep)
- Draft timeline from incident channel logs
- Identify 3-4 key decision points to discuss
- Invite all responders + affected team leads

### During (60 minutes max)
- Review timeline together (15 min)
- Identify contributing factors (20 min)
- Brainstorm action items (15 min)
- Assign owners and priorities (10 min)

### Facilitator Rules
- Redirect "who" questions to "what/why/how" questions
- If someone says "they should have..." → reframe as "what signal was missing?"
- Keep discussion forward-looking: "how do we catch this earlier next time?"
- Document dissenting opinions (they often reveal blind spots)

## Publication and Sharing

- Publish internally within 48 hours of incident resolution (5 business days max)
- Share at engineering all-hands monthly (top 2-3 incidents)
- Cross-team sharing when incident reveals systemic patterns
- Redact customer data; keep technical detail intact
- Searchable archive (wiki, Notion, Google Docs with consistent tagging)

## Anti-Patterns

- Blame disguised as root cause ("engineer deployed without testing")
- Action items with no owner or due date (they never happen)
- Postmortems written but never shared (learning stays siloed)
- Skipping postmortems for "small" incidents (pattern detection requires data)
- Same root cause appearing in multiple postmortems (action items not completing)
- Postmortem meeting becomes incident re-litigation (keep it forward-looking)
