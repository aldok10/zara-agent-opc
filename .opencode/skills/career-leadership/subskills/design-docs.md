# Subskill: Design Documents

> Activate when: explain system, design proposal, goals/non-goals, architecture write-up, new service

A design doc explains HOW a system works or will work. It's longer-lived than an RFC and read by anyone onboarding to or integrating with the system. Keep it under 10 pages -- past that, split it.

## Structure

```markdown
# Design: <system / feature name>

- **Authors**: <names>
- **Status**: Draft | Under Review | Approved | Implemented | Deprecated
- **Last updated**: <date> (version docs -- they evolve)

## TL;DR
What is this and why does it exist? 3-5 sentences.

## Background / Context
What exists today, what problem drove this, links to relevant RFCs/ADRs. Define jargon here.

## Goals and Non-Goals
- Goals: bulleted, measurable where possible.
- Non-Goals: what this explicitly does NOT do. Prevents scope creep and misaligned expectations.

## High-Level Design
The architecture at a glance. Lead with a diagram (C4 context/container). Prose explains the flow.

## Detailed Design
Components, data models, APIs, algorithms, failure modes. Sequence diagrams for interactions.
Enough that an implementer knows what to build.

## Alternatives Considered
Other designs, why rejected. Same discipline as an RFC.

## Risks and Mitigations
What could go wrong (perf, data loss, migration, dependency)? How do we reduce each?

## Testing Strategy
How do we know it works? Unit/integration/load, key scenarios, success metrics.

## Rollout Plan
Phases, flags, migration, backward compat, rollback.

## Open Questions
Unresolved items needing input.
```

## Diagrams

- **C4 model** for architecture, at increasing zoom:
  - Context: system + users + external systems.
  - Container: apps, services, data stores, and how they talk.
  - Component: internals of one container.
- **Sequence diagrams** for time-ordered interactions (request flows, protocols).
- Tools: **Mermaid** (renders in markdown/GitHub -- prefer for docs-as-code), **Excalidraw** (quick sketches), **Lucidchart** (polished/shared).

## Rules

- State the problem BEFORE the solution. A design doc with no problem statement is unreviewable.
- Non-Goals are as important as Goals -- they set boundaries.
- Diagrams over paragraphs for anything structural.
- Version the doc; note "last updated". Stale design docs mislead.
- Link out to ADRs for decisions and RFCs for the proposal -- don't duplicate.

## Anti-Patterns

- 30-page doc nobody reads -> split by component, link them.
- All prose, no diagrams -> readers can't build a mental model.
- Skipping alternatives -> looks like you didn't consider anything else.
