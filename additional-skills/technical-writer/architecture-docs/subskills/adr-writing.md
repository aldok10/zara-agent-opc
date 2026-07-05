---
type: subskill
title: "ADR Writing"
---

# ADR Writing

## Core Concepts
- Architecture Decision Records document significant technical decisions and their context
- Standard sections: Title, Status, Context, Decision, Consequences
- ADRs are immutable once accepted - new decisions supersede old ones rather than editing them
- Status lifecycle: Proposed → Accepted → Deprecated → Superseded
- ADRs capture "why" (the reasoning), not just "what" (the outcome)

## Key Practices
- Write ADRs at decision time, not retroactively - capture the context while it's fresh
- Document rejected alternatives with reasons for rejection (prevents relitigating)
- Keep each ADR focused on one decision; compound decisions get separate ADRs
- Use sequential numbering (ADR-001) and descriptive titles ("Use PostgreSQL for primary datastore")
- Link related ADRs: "supersedes ADR-003", "relates to ADR-012"

## Common Mistakes
- Writing ADRs for trivial decisions (library version bumps, formatting choices)
- Omitting consequences section - this is where future readers learn tradeoffs
- Retroactive ADRs that reconstruct context inaccurately from fading memory

## When to Apply
- Making technology choices that affect multiple teams or are expensive to reverse
- Choosing between architectural patterns (monolith vs microservices, sync vs async)
- Documenting decisions for compliance or audit trail requirements
