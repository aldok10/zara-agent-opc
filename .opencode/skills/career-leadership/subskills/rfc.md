---
type: subskill
title: "Subskill: RFC (Request for Comments)"
---

# Subskill: RFC (Request for Comments)

> Activate when: propose change, request feedback, review deadline, gather consensus, new system/API

An RFC proposes a change and invites feedback BEFORE implementation. Its job is to surface disagreement early, when it's cheap. A good RFC = someone can implement it without asking questions.

## Structure

```markdown
# RFC: <short descriptive title>

- **Status**: Draft | In Review | Accepted | Rejected | Withdrawn
- **Authors**: <name(s)>
- **Reviewers**: <names / teams>
- **Review deadline**: <date, ~1 week out>
- **Created**: <date>

## TL;DR
2-4 sentences. What are we changing and why? A reviewer decides here whether to read on.

## Motivation
Why does this problem matter now? What breaks or is painful today? Quantify if you can
(latency, cost, support load, dev friction). No solution yet -- just the problem.

## Proposal
What exactly are we building? Be concrete: APIs, data models, interfaces, behavior changes.
Include diagrams for anything structural. Enough detail that an implementer has no open questions.

## Alternatives Considered
For each: what it is, why it's viable, why we rejected it. Include "do nothing".
This is where you prove you did the thinking. An RFC with no alternatives is a decision in disguise.

## Rollout Plan
How do we ship this safely? Phases, feature flags, migration, backward compatibility,
rollback plan. Who is affected and how do they find out?

## Open Questions
Things you genuinely don't know yet. Flag them so reviewers focus attention here.
```

## Review Process

1. Author shares RFC, sets a review deadline (~1 week for async feedback).
2. Reviewers comment inline. Author responds to EVERY comment (agree + change, or explain why not).
3. Decision meeting ONLY if there's no consensus after async rounds. Meetings are for disagreement, not information transfer.
4. On acceptance, update status and link the tracking issue/design doc.

## Anti-Patterns

- Writing the RFC after implementation is done ("RFC theater").
- No review deadline -> it never gets reviewed.
- Solution in the Motivation section -> biases reviewers before they understand the problem.
- Ignoring comments you disagree with -> reviewers stop engaging.
- Too abstract to implement -> you'll get vague feedback and re-litigate at PR time.

## Good vs Bad

- BAD: "We should probably improve the API somehow." -> no decision possible.
- GOOD: "Replace REST polling with a WebSocket push channel; reduces p99 from 4s to <200ms; alternatives (long-poll, SSE) rejected below."
