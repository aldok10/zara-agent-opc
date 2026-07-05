---
type: fact
title: "Incident Process"
---

# Incident Process

End-to-end incident lifecycle from detection through postmortem, optimized for SLO-driven organizations.

## Detection Patterns

Incidents surface through three channels:

### Automated Detection (preferred)
- SLO burn-rate alerts (multi-window) fire when error budget consumption spikes
- Anomaly detection flags unusual patterns in latency, error rate, or traffic
- Synthetic monitoring catches user-visible failures before real users hit them
- Dependency health checks detect upstream/downstream degradation

### Human Detection
- On-call engineer notices degraded behavior during routine checks
- Customer support reports pattern of similar complaints
- Developer spots issue during deployment verification

### External Detection (worst case)
- Customer reports via support channel
- Social media mentions
- Third-party monitoring (Downdetector, StatusCake)

Goal: 90%+ of incidents detected by automated systems before customers notice.

## Triage Process

### Step 1: Confirm the incident (< 2 minutes)
- Check SLO dashboard for affected service
- Verify alert is not a false positive (check data source health)
- Confirm scope: single user, subset, or all users

### Step 2: Classify severity (< 3 minutes)
Based on SLO burn rate, not gut feeling:
- SEV1: error budget exhausted OR complete service outage
- SEV2: burn rate consuming >50% of budget in 1h window
- SEV3: elevated burn rate detected, customers partially impacted
- SEV4: internal-only impact, no customer-visible degradation

### Step 3: Declare and mobilize (< 5 minutes)
- Create incident channel (automated via bot for SEV1/SEV2)
- Page incident commander (IC) for SEV1/SEV2
- Update status page with initial customer-facing message
- Post initial assessment in incident channel

## Roles During Incident

| Role | Responsibility | Assigned |
|------|---------------|----------|
| Incident Commander (IC) | Coordination, decisions, communication | Rotational (SRE/Engineering lead) |
| Technical Lead | Investigation, diagnosis, fix implementation | Subject matter expert |
| Communications Lead | Status page, stakeholder updates | IC doubles for SEV3+ |
| Scribe | Timeline documentation, action logging | Any available team member |

IC authority: can pull any engineer into the war room, authorize production changes, decide rollback.

## Mitigation Strategy Order

Always attempt in this order:

1. **Rollback** -- revert last deployment (safest, fastest)
2. **Feature flag** -- disable problematic feature without full rollback
3. **Scale** -- add capacity if load-related
4. **Failover** -- switch to secondary region/instance
5. **Hotfix** -- forward-fix only when rollback impossible or would lose data

Never attempt a complex forward-fix under time pressure. Rollback buys thinking time.

## Communication Protocol

### Internal (Slack/incident channel)

Cadence by severity:
- SEV1: update every 15 minutes
- SEV2: update every 30 minutes
- SEV3: update every 2 hours

Template:
```
[TIME] Status: INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED
Impact: [what's broken for customers]
Current action: [what we're doing right now]
Next update: [when]
```

### External (status page)

Update within 10 minutes of customer-impacting incident declared.
Use plain language. Never blame third parties. State what's impacted, not why.

Template:
```
Investigating: [Service] performance degradation
We are aware of issues affecting [specific functionality]. 
Our team is actively investigating. We will provide an update within [time].
```

## Resolution and Closure

### Monitoring period
After mitigation applied, observe for 30 minutes (SEV1/2) or 15 minutes (SEV3/4) before declaring resolved.

### Closure checklist
- [ ] Customer impact fully resolved
- [ ] Error budget burn rate returned to normal
- [ ] Status page updated to "Resolved"
- [ ] Incident channel summary posted
- [ ] Timeline captured by scribe
- [ ] Postmortem owner assigned (within 1 business day)
- [ ] Follow-up meeting scheduled (within 5 business days)

## Postmortem Process

### Timeline (non-negotiable)
- Draft due: 3 business days after incident
- Review meeting: 5 business days after incident
- Action items tracked: in issue tracker with owners and due dates

### Blameless Culture

Focus on system conditions, not individual decisions:
- "The deployment pipeline did not catch the regression" (system gap)
- NOT "Engineer X deployed broken code" (blame)

Questions to ask:
- What information did the person have at the time?
- What system signals were missing that would have prevented this?
- How did the system allow this failure mode to exist?

### Action Item Categories

| Category | Purpose | Example |
|----------|---------|---------|
| Mitigate | Prevent this exact incident from recurring | Add input validation for the failing case |
| Detect | Catch the condition faster next time | Add SLO alert for this error class |
| Respond | Reduce time-to-mitigate | Create runbook for this failure mode |

Every action item must have: owner, due date, tracking ticket, and verification criteria.
