# Postmortem: [Incident Title]

**Incident ID**: INC-XXXX  
**Date**: YYYY-MM-DD  
**Duration**: Xh Ym (HH:MM - HH:MM UTC)  
**Severity**: SEV-X  
**Author**: [Name]  
**Review Date**: YYYY-MM-DD  

## Summary

One paragraph describing what happened, the customer impact, and how it was resolved. Written for someone who has 30 seconds.

## Impact

| Metric | Value |
|--------|-------|
| Duration of customer impact | Xh Ym |
| Requests failed | X,XXX |
| Error rate during incident | XX% |
| Users affected | X,XXX |
| Revenue impact (if applicable) | $X,XXX |
| SLO budget consumed | XX% of 30-day budget |
| Support tickets generated | XX |

## Timeline

All times in UTC.

| Time | Event |
|------|-------|
| HH:MM | [Trigger event -- deployment, config change, traffic spike, etc.] |
| HH:MM | [First signal -- alert fired, customer report, monitoring anomaly] |
| HH:MM | [Detection -- engineer acknowledged, incident declared] |
| HH:MM | [Triage -- severity assigned, IC designated, war room created] |
| HH:MM | [Investigation -- key diagnostic finding] |
| HH:MM | [Mitigation -- action taken (rollback, scale, failover)] |
| HH:MM | [Verification -- confirmed mitigation effective] |
| HH:MM | [Resolution -- declared resolved, monitoring period started] |

## Detection

How was the incident detected?

- [ ] Automated alert (SLO burn rate / anomaly detection)
- [ ] Synthetic monitoring
- [ ] Engineer noticed during routine work
- [ ] Customer report

**Time to detect**: X minutes from trigger to first signal  
**Detection gap**: [What monitoring was missing or delayed?]

## Root Causes

List contributing factors. There are always multiple causes -- single root cause is a myth.

### Primary Contributing Factor
[Technical explanation of the immediate cause]

### Enabling Conditions
- [System condition that allowed the primary cause to have impact]
- [Missing safeguard that would have prevented or limited blast radius]
- [Process gap that allowed the triggering action]

### Why wasn't this caught earlier?
- [Missing test coverage / review gap]
- [Monitoring blind spot]
- [Assumptions that proved incorrect]

## Mitigation

What was done to stop the bleeding:
1. [Action taken] -- [who] at [time]
2. [Action taken] -- [who] at [time]

What was attempted but didn't work:
1. [Failed attempt] -- [why it failed]

## Lessons Learned

### What went well
- [Things that worked as designed]
- [Quick detection, effective communication, fast rollback, etc.]

### What went poorly
- [Detection delay, communication gaps, tooling failures, etc.]

### Where we got lucky
- [Things that could have made it worse but didn't by chance]

## Action Items

### Mitigate (prevent recurrence)

| ID | Action | Owner | Due Date | Ticket |
|----|--------|-------|----------|--------|
| M1 | [Specific fix to prevent this exact failure] | @name | YYYY-MM-DD | JIRA-XXX |
| M2 | [Additional preventive measure] | @name | YYYY-MM-DD | JIRA-XXX |

### Detect (catch faster)

| ID | Action | Owner | Due Date | Ticket |
|----|--------|-------|----------|--------|
| D1 | [New alert or monitoring to catch this earlier] | @name | YYYY-MM-DD | JIRA-XXX |
| D2 | [Improve existing detection] | @name | YYYY-MM-DD | JIRA-XXX |

### Respond (fix faster)

| ID | Action | Owner | Due Date | Ticket |
|----|--------|-------|----------|--------|
| R1 | [Runbook creation or update] | @name | YYYY-MM-DD | JIRA-XXX |
| R2 | [Tooling improvement for faster mitigation] | @name | YYYY-MM-DD | JIRA-XXX |

## Supporting Information

### Related Incidents
- [INC-XXXX: Similar incident from past, if any]

### References
- [Link to dashboard during incident]
- [Link to deploy that triggered]
- [Link to war room chat log]
- [Link to relevant architecture doc]

---

**Review Attendees**: [Names of people in postmortem review meeting]  
**Next Review**: [Date if follow-up needed to verify action items]
