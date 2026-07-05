---
type: subskill
title: "Ubiquitous Language"
---

# Ubiquitous Language

## Core Concepts

- One shared vocabulary used by developers, domain experts, and stakeholders  -  no translation layer
- Terms are precise within a bounded context; ambiguity is a design smell
- The language appears in code (class names, methods), docs, and conversations identically
- Language evolves: when understanding deepens, rename things  -  don't preserve legacy confusion
- Disagreement on terms reveals disagreement on concepts  -  resolve the concept first

## Key Practices

- Build a glossary collaboratively with domain experts during discovery sessions
- Name code elements using domain language: `PolicyHolder`, not `User`; `Claim`, not `Request`
- Challenge synonyms: if two people use different words for the same thing, pick one and commit
- Use the language in all artifacts: tickets, tests, documentation, conversations
- When a term feels wrong or forced, it signals a modeling problem  -  investigate

## Common Mistakes

- Developers invent technical names that domain experts don't recognize
- Allowing synonyms to persist: "customer" in code, "client" in meetings, "account" in the database
- Treating the glossary as a one-time artifact instead of a living document

## When to Apply

- Starting a new project or onboarding to an existing domain
- Miscommunication between technical and business teams causes incorrect implementations
- Code uses generic names (Manager, Service, Handler) that carry no domain meaning
- Refactoring reveals that naming inconsistencies mask different business concepts
