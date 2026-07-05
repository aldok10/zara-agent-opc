---
type: subskill
title: "Bounded Contexts"
---

# Bounded Contexts

## Core Concepts

- A bounded context is a boundary within which a domain model has consistent meaning
- The same word (e.g., "Account") means different things in different contexts  -  this is fine
- Context boundaries align with team ownership and deployment units
- Communication between contexts happens through explicit contracts, not shared databases
- Context maps show relationships: upstream/downstream, conformist, anticorruption layer

## Key Practices

- Identify contexts by finding where language changes meaning across teams or departments
- Draw context maps before designing integrations  -  make relationships visible
- Use anticorruption layers when translating between contexts with conflicting models
- Define published language for shared contracts between contexts
- Keep context boundaries stable; change internal models freely within them

## Common Mistakes

- Creating one giant unified model that tries to serve all teams  -  leads to coupling
- Sharing database tables across contexts  -  creates hidden dependencies
- Ignoring political/organizational boundaries that naturally define contexts

## When to Apply

- System has multiple teams working on overlapping business concepts
- Same term means different things to different stakeholders
- Designing microservice boundaries or module boundaries in a monolith
- Integration points between systems cause constant translation bugs
