---
type: subskill
title: "Traceability"
---

# Traceability

## Core Concepts

- Traceability links requirements to their origin (why), implementation (how), and verification (proof)
- Forward traceability: requirement -> design -> code -> test
- Backward traceability: test -> code -> design -> requirement -> business goal
- Gaps in the chain reveal untested requirements or code without justification
- Traceability enables impact analysis: "if this requirement changes, what else is affected?"

## Key Practices

- Assign stable IDs to requirements; reference them in commits, tests, and design docs
- Maintain a traceability matrix linking requirements to test cases — automate where possible
- Tag user stories with parent epics/goals so business value flows down to tasks
- When requirements change, trace forward to identify all affected artifacts
- Use lightweight linking (ticket references, tags) over heavyweight tools when starting out

## Common Mistakes

- Creating traceability artifacts that nobody maintains — stale matrices are worse than none
- Over-engineering: tracing every line of code to a requirement adds overhead without insight
- Losing the "why": requirements exist but nobody remembers which business goal they serve

## When to Apply

- Regulated domains requiring audit trails (healthcare, finance, aviation)
- Large systems where change impact is hard to assess without formal links
- Teams experiencing "orphan code" — features nobody remembers requesting
- Post-incident analysis reveals a requirement was implemented but never tested
