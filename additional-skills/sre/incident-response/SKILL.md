---
name: incident-response
description: "Incident management: detection, triage, communication, postmortem, SLO-driven severity"
---

# Incident Response

Structured incident lifecycle from detection through postmortem with SLO-driven severity classification.

## Scope

Covers incident detection patterns, severity classification based on SLO burn rates, triage procedures, communication protocols (status pages, stakeholder updates), mitigation strategies, and blameless postmortem process. Integrates with PagerDuty, Slack, and incident.io tooling.

## First Action

When loaded: determine incident state -- is this active (triage/mitigate) or retrospective (postmortem)? For active: check SLO dashboards, recent deploys (`git log --oneline -10`), and alerting channels. For postmortem: gather timeline from incident tool.

## Constraints

1. Severity derived from SLO impact: SEV1 = error budget exhausted, SEV2 = >50% burn in 1h, SEV3 = elevated burn rate
2. Incident commander (IC) assigned within 5 minutes of SEV1/SEV2 declaration
3. Status page updated within 10 minutes of customer-impacting incident
4. Communication cadence: SEV1 every 15 min, SEV2 every 30 min, SEV3 every 2 hours
5. First mitigation action within 15 minutes; prefer rollback over forward-fix under pressure
6. All incidents get a postmortem document within 3 business days
7. Postmortem must include: timeline, impact quantification, root causes (plural), action items with owners
8. Action items classified: mitigate (prevent recurrence), detect (catch faster), respond (fix faster)
9. No blame assignment in postmortems -- focus on system conditions that allowed failure
10. Rollback is always the first mitigation option unless data corruption risk exists
11. War room channel created automatically on SEV1/SEV2 declaration
12. All mitigation commands logged in incident channel with timestamp and author
13. Post-incident review meeting within 5 days; attendance mandatory for involved teams

## DO NOT

1. Assign severity based on gut feeling -- use SLO burn rate data
2. Attempt complex debugging during active incident before trying rollback
3. Skip status page updates because the fix is "almost done"
4. Allow more than one person to make production changes simultaneously during incident
5. Close incident without quantified customer impact (requests failed, duration, users affected)
6. Write postmortem with "human error" as root cause (find the system gap)
7. Create action items without owners and due dates
8. Page entire team -- page the on-call, escalate if needed
9. Communicate internally without updating external status page

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Alert from SLO burn rate | sre-observability | Dashboard investigation, trace analysis |
| Network connectivity issue | sre-networking | Hubble flows, policy audit |
| GCP service degradation | sre-gcp | Status dashboard, failover procedures |
| Security breach detected | sre-security-ops | Containment, forensics |
| Incident caused by deployment | sre-platform-engineering | Rollback path, deploy pipeline |

## Verification

- [ ] Severity classification matches SLO burn rate evidence
- [ ] IC assigned and acknowledged within SLA
- [ ] Status page reflects current customer impact
- [ ] Communication cadence maintained (check timestamps)
- [ ] Rollback considered and decision documented
- [ ] Postmortem completed within 3 business days
- [ ] Action items have owners, due dates, and tracking tickets
- [ ] Error budget impact quantified in SLO dashboard

## Knowledge

- knowledge/incident-severity-framework.md
- knowledge/postmortem-template.md
- knowledge/rollback-procedures.md
- knowledge/communication-templates.md

## AI-Era Context (2026)

- incident.io and Rootly automate IC assignment, status pages, and postmortem drafts
- AI-assisted root cause analysis suggests contributing factors from correlated signals
- Automated rollback triggered by SLO burn rate exceeding threshold (no human needed for SEV3)
- LLM-generated postmortem timelines from Slack/PagerDuty/deploy logs reduce toil
- Chaos engineering (Litmus, Gremlin) validates incident runbooks continuously
- SLO-based auto-severity classification eliminates subjective triage decisions
- GitOps rollback (Argo Rollouts, Flagger) is sub-minute for Kubernetes workloads

## Related Skills

- sre-observability
- sre-networking
- sre-gcp
- sre-security-ops
