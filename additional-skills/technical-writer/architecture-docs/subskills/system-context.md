---
type: subskill
title: "System Context Documentation"
---

# System Context Documentation

## Core Concepts
- System context docs describe how a system fits within its broader environment
- Scope: external actors, dependencies, integration points, trust boundaries
- Based on C4 model Level 1: system context diagram + supporting narrative
- Answers: who uses this system, what does it depend on, what depends on it
- Living document: update when integration points or external dependencies change

## Key Practices
- Start with a visual diagram showing the system, its users, and external systems
- Label every connection with: protocol, data exchanged, direction, authentication method
- Document SLAs and expectations for each external dependency
- Include failure modes: what happens when each external dependency is unavailable
- Version the context doc alongside the system it describes

## Common Mistakes
- Including internal architecture detail (that belongs at component/container level)
- Listing dependencies without explaining the nature of the dependency (sync/async, criticality)
- Creating the diagram once and never updating as integrations change

## When to Apply
- Onboarding new team members to understand how a system fits in the ecosystem
- Starting architecture reviews or threat modeling sessions
- Planning changes that affect integration points with other teams' systems
