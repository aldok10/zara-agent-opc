---
type: subskill
title: "Splitting Patterns"
---

# Splitting Patterns

## Core Concepts

- Stories too large for one sprint must be split while preserving user-facing value in each slice
- Split along value lines, not technical layers  -  "API" and "UI" are not good splits
- Each resulting story should be independently deployable and testable
- Good splits reduce risk by delivering feedback earlier
- Nine canonical patterns: workflow steps, business rules, data variations, interfaces, operations, scenarios, roles, spikes, acceptance criteria

## Key Practices

- Split by workflow step: "user can search" separate from "user can filter results"
- Split by business rule complexity: handle the common case first, exceptions later
- Split by data variation: support one payment method first, add others incrementally
- Split by operation: read-only view first, then edit, then delete
- Validate each split: does it deliver value a user or stakeholder would notice?

## Common Mistakes

- Splitting into technical tasks (backend, frontend, database)  -  these aren't stories
- Creating a "spike" story that produces no deployable increment
- Splitting so thin that individual stories are meaningless to stakeholders

## When to Apply

- Story is estimated at more than half the team's sprint capacity
- Story has more than 5 acceptance criteria  -  signal it contains multiple behaviors
- Team struggles to complete stories within a sprint
- Uncertainty is high: splitting creates earlier feedback loops
