---
type: fact
title: "Communication Planning"
---

# Communication Planning

## Communication Frequency

### By Stakeholder Type

| Stakeholder Type | Frequency | Format | Content |
|-----------------|-----------|--------|---------|
| Executive Sponsor | Bi-weekly | 1:1 or brief email | Status, risks, decisions needed |
| Steering Committee | Monthly | Presentation (15 min) | Progress, milestones, blockers |
| Product Owner | Daily/as needed | Standup, chat | Priorities, clarifications |
| Development Team | Daily | Standup, shared board | Tasks, impediments, scope |
| End Users | Per milestone | Demo, newsletter | What's coming, what changed |
| Support Team | Pre-release | Training session | New features, known issues |
| Adjacent Teams | Bi-weekly | Sync meeting | Dependencies, impacts |

### Frequency Rules

- Higher power/interest = more frequent
- Escalate frequency during risk periods
- Reduce frequency during stable execution
- Never go dark on a key stakeholder for more than 2 weeks

## Communication Channels

### Channel Selection

| Need | Best Channel | Avoid |
|------|-------------|-------|
| Decision needed | Meeting or 1:1 | Email thread |
| Status update | Written summary | Long meeting |
| Bad news | Face-to-face/video | Email without follow-up |
| Technical details | Document + review | Verbal only |
| Quick question | Chat/DM | Scheduled meeting |
| Broad awareness | Newsletter/wiki | Individual emails |

### Channel Characteristics

- **Synchronous** (meetings, calls): high bandwidth, immediate feedback, costly in time
- **Asynchronous** (email, docs, wiki): scalable, searchable, allows reflection
- **Push** (email, notification): ensures delivery, risks overload
- **Pull** (wiki, dashboard): no interruption, risks being missed

## Tailoring the Message

### By Audience

**Executives care about:**
- Business impact (revenue, cost, risk)
- Timeline and milestones
- Decisions they need to make
- Exceptions and escalations

Format: 3-5 bullet points. Lead with the ask. One page maximum.

**Product/Business stakeholders care about:**
- Feature progress and scope changes
- User impact
- Trade-offs being made
- What's next

Format: Visual progress (demo, screenshots), prioritized list.

**Technical stakeholders care about:**
- Architecture decisions and rationale
- Technical risks and mitigations
- Dependencies and integration points
- Quality metrics

Format: Diagrams, ADRs, metrics dashboards.

**End users care about:**
- What changes for them
- When it changes
- How to use new features
- Where to get help

Format: Release notes, short videos, in-app guidance.

### Message Structure (Pyramid Principle)

1. **Lead with the conclusion/ask** (what do you need from them?)
2. **Supporting points** (3 max, most important first)
3. **Details available on request** (link to full doc)

### Bad News Formula

1. State the fact directly (no burying)
2. Explain the impact
3. Present what you're doing about it
4. State what you need from them (if anything)
5. Provide the timeline for resolution

## Communication Plan Template

```
| Audience | Message | Channel | Frequency | Owner | Feedback Loop |
```

### Feedback Loop

Every communication should have a way for recipients to respond:
- Meeting: Q&A time built in
- Email: "Reply by [date] if you have concerns"
- Document: Comments enabled, review deadline set
- Demo: Follow-up survey or retro

## Escalation Path

Define before you need it:

```
Level 1: Team lead resolves within team (< 1 day)
Level 2: Product owner arbitrates scope/priority (< 2 days)
Level 3: Sponsor resolves cross-team conflicts (< 1 week)
Level 4: Steering committee for strategic changes
```

## Communication Anti-Patterns

- **Info dump**: Sending everything to everyone (nobody reads it)
- **Surprise bad news**: Stakeholder learns about problems from someone else
- **Update-only meetings**: Could have been an email
- **No feedback mechanism**: Broadcast without listening
- **Inconsistent cadence**: Creates anxiety in gaps
- **Technical jargon to business audience**: Loses trust
- **Business platitudes to technical audience**: Loses respect
