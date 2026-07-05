---
type: subskill
title: "Escalation"
---

# Escalation

## Core Concepts
- Escalation transfers incident ownership to someone with more context, authority, or expertise
- Escalation levels: L1 (first responder), L2 (domain expert), L3 (architect/vendor), management
- Triggers: time-based (SLA clock), severity-based (impact threshold), expertise-based (unknown domain)
- Escalation is not failure - it's efficient resource allocation under pressure
- Clear ownership at every level prevents bystander effect during incidents

## Key Practices
- Define escalation paths per service with named contacts and communication channels
- Set automatic escalation timers: if no acknowledgment in N minutes, page next level
- Include business stakeholders in escalation for customer-impacting incidents
- Document what information to pass during escalation (timeline, actions taken, hypothesis)
- Post-incident: review whether escalation was timely and appropriate

## Common Mistakes
- Escalating without context, forcing the next responder to start from zero
- Hero culture: refusing to escalate because it feels like admitting defeat
- Unclear ownership after escalation - both parties assume the other is handling it

## When to Apply
- Designing incident response procedures for a new organization or service
- When an active incident exceeds the responder's expertise or authority
- Establishing cross-team coordination for services with shared dependencies
