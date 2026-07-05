---
type: fact
title: "Postmortem Guide"
---
# Postmortem Guide

## Blameless Culture

### Why Blame Kills Learning
- People hide information when they fear punishment
- Complex systems fail from multiple contributing factors, not one person
- Blame focuses on WHO instead of WHY and HOW
- Engineers who fear blame won't take risks or move fast
- The goal is systemic improvement, not individual accountability

### Establishing Blameless Practice
- Name it explicitly: "This is a blameless postmortem"
- Use "the system allowed" not "person X caused"
- Celebrate people who surface issues early
- Leadership must model this -- one blame incident undoes months of culture
- Focus language on actions and conditions, not character

## Timeline Reconstruction

### Building the Timeline
- Start from first signal (alert, customer report, anomaly)
- Document each action taken and by whom (factual, not evaluative)
- Include what information was available at each decision point
- Note communication gaps and delays
- End at full resolution and customer impact end

### Five Whys Technique
- Start with the observable failure
- Ask "why" iteratively to find root causes
- Stop when you reach a systemic/process issue
- Usually 3-5 levels deep is sufficient
- Multiple branches are normal (not always linear)

### Contributing Factors (not "root cause")
- Technical: code bug, config error, capacity limit
- Process: missing runbook, unclear ownership, no alert
- Organizational: understaffing, competing priorities, knowledge silos
- Environmental: dependency failure, traffic spike, upstream change
- Human: fatigue, context switching, information overload

## Writing Effective Action Items

### SMART Format
- **Specific**: "Add circuit breaker to payment service" not "improve resilience"
- **Measurable**: define what done looks like
- **Assigned**: one owner (not "the team")
- **Realistic**: achievable within stated timeline
- **Time-bounded**: due date, not "eventually"

### Categories
- Detect: improve alerting, monitoring, observability
- Mitigate: reduce blast radius, add circuit breakers, failover
- Prevent: fix the underlying cause, add validation, improve testing
- Process: update runbooks, improve communication, add review gates

### Prioritization
- P0: Could cause same incident again without fix
- P1: Significantly reduces risk or detection time
- P2: Improves response but doesn't prevent recurrence
- Track completion -- unfinished action items are a smell

## Meeting Facilitation

### Before the Meeting
- Draft timeline from logs, alerts, and chat transcripts
- Share draft 24h before so attendees can comment async
- Invite: responders, relevant engineers, affected team leads
- Set time limit (60-90 min max)

### During the Meeting
- Facilitator is NOT the incident commander (fresh perspective)
- Walk through timeline -- fill gaps, correct errors
- Ask: "What surprised you?" and "What would you change?"
- Capture action items in real-time with owners
- Park tangents -- "good point, let's capture that separately"

### Facilitation Tips
- Redirect blame language gently but immediately
- "What did the system allow?" instead of "Why did you?"
- Give quiet people space to contribute
- Time-box each section of the timeline
- End with: "What went well in our response?"

## Patterns Worth Documenting

### Repeated Incidents
- If the same class of issue recurs, the action items aren't working
- Look for systemic patterns: same team, same component, same time
- Consider: are we treating symptoms instead of causes?
- Track incident categories over time (tag them)

### Cascading Failures
- Document the cascade path explicitly
- Identify where the cascade could have been stopped
- Common stoppers: circuit breakers, bulkheads, rate limits, timeouts
- Test failure isolation regularly (chaos engineering lite)

### Near-Misses
- Treat near-misses as free learning (no customer impact)
- Same analysis process, lighter touch
- Document what WOULD have happened without intervention
- These are leading indicators -- use them

## Publishing and Sharing

### Internal Sharing
- Post to a searchable location (wiki, docs, shared drive)
- Send summary to engineering org (normalize transparency)
- Present at team all-hands or engineering reviews
- Tag by service, failure mode, and contributing factor

### What to Include in Public Write-up
- What happened (customer-visible impact)
- Timeline (key events, not internal names)
- Root cause (technical, appropriate level of detail)
- What you're doing to prevent recurrence
- Skip: internal blame, exact code, security details

### Building Institutional Knowledge
- Quarterly review: which action items completed? Which patterns recurring?
- New engineer onboarding: read past postmortems for context
- Cross-team sharing: "Here's what we learned" presentations
- Update runbooks with learnings from each incident
