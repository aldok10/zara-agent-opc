---
type: subskill
title: "Incident Communication"
---

# Incident Communication

## Core Concepts
- Incident communication keeps stakeholders informed without distracting responders
- Roles: Incident Commander (decisions), Communications Lead (updates), responders (execution)
- Channels: internal (engineering war room), external (status page, customer notifications)
- Cadence: regular updates even when "still investigating"—silence breeds panic
- Post-incident: blameless retrospective focused on systemic improvements

## Key Practices
- Designate a Communications Lead separate from technical responders
- Use templates for status updates: what's happening, who's affected, what we're doing, next update ETA
- Communicate in business impact terms externally ("users cannot check out") not technical terms ("Redis OOM")
- Maintain a running timeline in incident channel: timestamp + action/finding
- Set expectations: "we will update every 30 minutes until resolved"

## Common Mistakes
- Technical responders context-switching to write updates (slows resolution)
- Providing overly technical updates to non-technical stakeholders
- Going silent during investigation—stakeholders assume nobody is working on it

## When to Apply
- Active incidents affecting customers or internal SLAs
- Designing incident management processes and role definitions
- Running incident response drills (game days) to practice communication flow
