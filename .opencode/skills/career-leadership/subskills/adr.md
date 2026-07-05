---
type: subskill
title: "Subskill: ADR (Architecture Decision Record)"
---

# Subskill: ADR (Architecture Decision Record)

> Activate when: record decision, why we chose X, architecture choice, lock in a decision

An ADR captures a single architectural decision and the reasoning behind it. Six months later, nobody remembers WHY -- the ADR answers that. Record the WHY, not just the WHAT.

## Structure

```markdown
# ADR-0007: Use PostgreSQL for the events store

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-0012
- **Date**: 2026-07-04
- **Deciders**: <names>

## Context
What situation forces a decision? Constraints, requirements, forces at play.
Facts only -- what's true regardless of what we choose. E.g. "We need ordered,
durable event storage with <50ms writes and ad-hoc query support."

## Decision
What we chose, stated plainly and actively: "We will use PostgreSQL with
logical replication." One decision per ADR.

## Consequences
What becomes true because of this -- good AND bad. E.g.
+ Mature tooling, team already knows it, transactional guarantees.
- Vertical scaling ceiling; we accept re-evaluating at 50k writes/sec.
Include follow-on work this decision creates.
```

## Rules

- **Immutable once accepted.** Never edit an accepted ADR. If it changes, write a NEW ADR and mark the old one `Superseded by ADR-NNNN`. The history is the point.
- **Number sequentially**: `0001-title.md`, `0002-title.md`, ... Zero-padded for sort order.
- **Store in the repo**: `docs/adr/`. Decisions live with the code they govern, versioned together.
- **Always have a status.** A statusless ADR is noise -- readers can't tell if it's current.
- **One decision per record.** If you're deciding two things, write two ADRs.
- **Short.** An ADR is usually one page. If it's growing, the reasoning belongs in a design doc that the ADR links to.

## Status Lifecycle

```
Proposed --> Accepted --> Deprecated (no longer relevant)
                     \--> Superseded by ADR-NNNN (replaced by newer decision)
```

## Why WHY Matters

The decision ("use Postgres") is discoverable from the code. The reasoning ("we rejected DynamoDB because we needed ad-hoc joins and the team had no DynamoDB experience") is NOT -- it evaporates from memory. Capturing it prevents relitigating settled decisions and helps future engineers understand constraints that may since have changed.

## Anti-Patterns

- Editing old ADRs to reflect new reality -> destroys decision history.
- Recording only WHAT with no context -> useless in 6 months.
- Writing ADRs for trivial choices -> reserve for decisions that are costly to reverse.
