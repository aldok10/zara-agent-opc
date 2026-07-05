---
type: subskill
title: "Alerting"
---

# Alerting

## Core Concepts
- Alerts notify humans when systems require attention; they bridge monitoring and response
- Alert severity levels: critical (immediate action), warning (investigate soon), info (awareness)
- Signal vs noise: every alert should be actionable, timely, and relevant
- Multi-window, multi-burn-rate alerting detects both fast burns and slow degradations
- Alert routing: right person, right time, right channel (page vs email vs chat)

## Key Practices
- Alert on symptoms (user impact) not causes (CPU high) - symptoms tell you something is wrong
- Include runbook link, impact summary, and relevant dashboard URL in every alert
- Use burn-rate alerting for SLO-based systems: 14.4x burn = page, 6x burn = ticket, 1x = dashboard
- Implement alert deduplication and grouping to prevent notification storms
- Review alert quality monthly: suppress or fix alerts with >50% false positive rate

## Common Mistakes
- Alerting on every metric threshold instead of meaningful user-impact indicators
- Setting thresholds too tight, creating alert fatigue that causes real alerts to be ignored
- Not having escalation for unacknowledged alerts (page disappears into void)

## When to Apply
- Setting up monitoring for new production services
- Reducing alert fatigue on an existing on-call rotation
- Implementing SLO-based alerting to replace threshold-based approaches
