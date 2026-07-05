---
type: subskill
title: "On-Call Practices"
---

# On-Call Practices

## Core Concepts
- On-call is the practice of having engineers available to respond to production incidents
- Rotation schedules: primary + secondary, with handoff procedures and escalation paths
- Toil budget: on-call should not consume >25% of an engineer's time on reactive work
- Runbooks transform tribal knowledge into repeatable incident response procedures
- Compensation: on-call burden must be recognized (time-off, pay, reduced sprint load)

## Key Practices
- Define clear escalation criteria: what severity warrants paging vs next-business-day
- Maintain runbooks for every alert—an alert without a runbook is incomplete
- Conduct handoff at rotation boundaries: document active issues, pending changes, known risks
- Track interrupt metrics: page volume, time-to-acknowledge, time-to-resolve, false positive rate
- Schedule regular on-call review to reduce noise and improve signal quality

## Common Mistakes
- Paging on symptoms without actionable remediation steps (alert fatigue)
- Single points of failure: one person holds all context for a critical system
- Not distinguishing between "needs immediate response" and "needs awareness"

## When to Apply
- Setting up on-call rotations for a new team or service
- Reducing alert fatigue and improving on-call quality of life
- Establishing on-call processes as part of production readiness review
