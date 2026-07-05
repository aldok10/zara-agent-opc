---
type: fact
title: "Severity Levels"
---

# Severity Levels

SLO-driven severity classification that removes subjectivity from incident triage.

## Severity Framework

Severity is derived from measurable SLO impact, not opinion or caller urgency.

| Level | SLO Signal | Customer Impact | Response SLA |
|-------|-----------|----------------|-------------|
| SEV1 | Error budget exhausted (0% remaining) | Complete outage or data loss | Page immediately, all hands |
| SEV2 | >50% budget consumed in 1h window | Major feature unavailable for many users | Page IC, assemble war room |
| SEV3 | Elevated burn in 6h window | Degraded experience for subset of users | Interrupt current work, triage |
| SEV4 | Anomaly detected, within budget | Internal tooling or non-customer-facing | Next business day |

## Classification Decision Tree

```
Is there active data loss or corruption?
  YES -> SEV1 (regardless of SLO numbers)
  NO  -> Continue

Is error budget at 0% for any critical SLO?
  YES -> SEV1
  NO  -> Continue

Is 1h burn rate > 14x (consuming >2% budget per hour)?
  YES -> SEV2
  NO  -> Continue

Is 6h burn rate > 6x (consuming >5% budget in 6 hours)?
  YES -> SEV2
  NO  -> Continue

Is 3d burn rate > 1x (on track to exhaust budget)?
  YES -> SEV3
  NO  -> Continue

Is there customer-visible impact below SLO threshold?
  YES -> SEV3 (may downgrade to SEV4 after triage)
  NO  -> SEV4
```

## Escalation Rules

### Upward Escalation
- SEV3 not mitigated within 2 hours -> escalate to SEV2
- SEV2 not mitigated within 30 minutes -> page Engineering Director
- SEV1 -> VP Engineering notified within 15 minutes
- Any severity lasting >4 hours -> Executive notification

### Lateral Escalation
- Network symptoms -> page networking on-call
- Database symptoms -> page DBA on-call
- Third-party dependency -> open vendor support ticket immediately
- Security indicators -> page Security on-call, treat as SEV2 minimum

### Downgrade Rules
- False positive confirmed -> resolve, no postmortem needed
- Impact narrower than initially thought -> lower severity with justification
- Never downgrade to avoid postmortem obligation (SEV1/2 always require postmortem)

## Response Time SLAs

| Severity | Acknowledge | First Update | IC Assigned | Status Page |
|----------|-------------|--------------|-------------|-------------|
| SEV1 | 5 min | 10 min | 5 min | 10 min |
| SEV2 | 15 min | 20 min | 15 min | 15 min |
| SEV3 | 30 min | 60 min | Optional | If customer-facing |
| SEV4 | Next day | N/A | N/A | No |

## On-Call Responsibilities by Severity

### SEV1/SEV2
- Primary on-call: acknowledge, initial triage, page IC if not self
- IC: coordinate response, make decisions, own communication
- Secondary on-call: join war room, assist investigation
- Manager: aware, available for escalation decisions

### SEV3
- Primary on-call: triage, determine if action needed now or next business day
- If actionable now: fix or create high-priority ticket
- No IC needed unless scope expands

### SEV4
- Captured as ticket, prioritized in next sprint planning
- No interrupt to anyone's current work

## Severity and SLO Mapping

Map each critical service to specific SLOs that drive severity:

```yaml
services:
  payment-api:
    slos:
      - name: availability
        target: 99.9%
        window: 30d
        sev1_threshold: 0%_remaining
        sev2_threshold: 50%_consumed_1h
      - name: latency-p99
        target: 500ms
        window: 30d
        sev2_threshold: p99 > 2000ms for 10min
        sev3_threshold: p99 > 1000ms for 30min

  checkout-flow:
    slos:
      - name: success-rate
        target: 99.5%
        window: 30d
        sev1_threshold: success_rate < 90% for 5min
        sev2_threshold: success_rate < 95% for 15min
```

## Severity vs Priority

Severity = current customer impact (determined during incident).
Priority = importance of fixing the underlying cause (determined post-incident).

A SEV3 incident might have P1 follow-up if the underlying issue could become SEV1 under load.
A SEV1 incident might have P3 follow-up if it required a rare confluence of events.

## Anti-Patterns

- Using severity as bargaining tool ("make it SEV2 so it gets fixed faster")
- Severity inflation by non-engineering teams to get attention
- Downgrading severity to avoid postmortem paperwork
- Fixed severity that never changes during incident (reassess as scope clarifies)
- Treating all alerts as SEV3+ (alert fatigue leads to missed real incidents)
