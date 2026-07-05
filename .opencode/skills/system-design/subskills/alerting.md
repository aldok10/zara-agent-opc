---
type: subskill
title: "Alerting Strategy & Incident Response"
---

# Alerting Strategy & Incident Response

Good alerting wakes people only when a human must act. Everything else is a dashboard or a ticket.

## Philosophy
Alert on **symptoms** (SLO breach, error rate spike), not **causes** (CPU high, disk 80%). Symptoms scale with user impact; causes generate noise.

## Alert levels
- **PAGE** (wake someone up): SLO burn rate 14.4x (2% budget in 1 hour), complete outage, data-loss risk.
- **TICKET** (next business day): SLO burn rate 6x (6-hour window), degraded non-critical service, resource approaching limit.
- **NOTIFICATION** (weekly review): SLO burn rate 1x, trending issues, capacity-planning signals.

## Alert quality checklist
- **Actionable?** Can the responder DO something?
- **Timely?** Fires within minutes, not hours.
- **Relevant?** Targets the right team, not everyone.
- **Contextualized?** Includes what, where, since when, link to runbook, link to dashboard.

## Runbooks
Every PAGE-level alert MUST have a runbook: what triggered it, what to check first, common fixes, escalation path, who to contact.

## On-call practices
- Rotation schedule (typically 1 week), primary + secondary.
- Handoff ritual: open issues, known risks.
- Follow-the-sun for global teams.

## Incident response flow
detect (alert) → triage (severity) → mitigate (stop the bleeding) → resolve (fix root cause) → review (post-mortem).

## Post-mortem
Blameless, focused on system failures. Template: timeline, impact, root cause, contributing factors, action items with owners and deadlines.

## Alert fatigue
If the team ignores >10% of alerts, they're too noisy. Fix: tune thresholds, group related alerts, deduplicate, delete useless ones.

## Tools
- **PagerDuty / OpsGenie**: paging and escalation.
- **Grafana Alerting**: metrics-based alerts.
- **AlertManager**: Prometheus alert routing.

## Anti-patterns
- Alerting on every metric threshold → fatigue.
- No runbooks → slow, panicked response.
- Paging on non-actionable alerts → burnout.
- Alerts without context → wasted triage time.
- No post-mortems → same incident recurs.
