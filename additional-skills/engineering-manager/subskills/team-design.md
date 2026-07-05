# Team Design

Team topologies, cognitive load management, boundaries, and scaling engineering organizations.

## When to Load

- Restructuring or forming new teams
- Addressing cross-team coordination problems
- Managing cognitive load as systems grow
- Choosing team interaction modes

## Key Concepts

**Team Topologies** -- Four types: Stream-aligned (business capability), Platform (internal services), Enabling (coaching/guidance), Complicated Subsystem (deep expertise). Most teams should be stream-aligned.

**Cognitive Load** -- Three types: intrinsic (inherent complexity), extraneous (unnecessary complexity from poor tools/processes), germane (learning). Teams exceed cognitive load when they own too many domains or systems.

**Team Boundaries** -- Define ownership by: business domain (preferred), service/component, user journey. Clear boundaries mean: one team owns a decision, deploys independently, handles on-call for their domain.

**Interaction Modes** -- Collaboration (working closely together, temporary), X-as-a-Service (clear API contract), Facilitating (helping other teams adopt new practices). Default to X-as-a-Service for autonomy.

**Team Size** -- 5-8 engineers (Dunbar's two-pizza rule). Smaller for higher-complexity domains. Larger teams signal the domain should be split.

## Patterns

```
# Team Topology Example: E-Commerce

Stream-aligned teams (own business capability end-to-end):
  - Checkout Team: cart, payment, order creation
  - Catalog Team: products, search, categories
  - Fulfillment Team: shipping, tracking, returns
  - Growth Team: onboarding, recommendations, notifications

Platform team (reduces cognitive load for stream teams):
  - Developer Experience: CI/CD, deployment, observability tooling
  - Data Platform: data pipeline, analytics infrastructure, feature flags

Enabling team (temporary, coaches then disbands):
  - Cloud Migration: helps teams move to Kubernetes (6-month mission)

Complicated Subsystem:
  - ML/Recommendations: specialized expertise, provides API to stream teams
```

```
# Cognitive Load Assessment

Team: Checkout
Systems owned: cart-service, payment-service, order-service, legacy-checkout
External dependencies: 4 upstream, 3 downstream
On-call services: 3
Languages/frameworks: TypeScript, Go, legacy PHP
Cognitive load score: HIGH (signal to split or offload)

Proposed split:
  - Payment Team: payment-service, payment compliance
  - Order Team: cart-service, order-service
  - Deprecate: legacy-checkout (migration project)
```

```
# Interaction Mode Selection

| Situation | Mode | Duration |
|-----------|------|----------|
| Two teams building a new feature together | Collaboration | 2-4 weeks |
| Platform providing deploy tooling | X-as-a-Service | Permanent |
| Helping a team adopt observability | Facilitating | 1-2 quarters |
| Teams with unclear boundaries fighting | Collaboration -> define boundary -> X-as-a-Service | Transition |
```

## Gotchas

- Component teams (frontend team, backend team, database team) create handoff queues -- prefer stream-aligned
- Too many platform teams servicing too few stream teams inverts the value (overhead > benefit)
- Reorganizing teams without changing architecture creates confusion (Conway's Law works both ways)
- "Shared ownership" means "no ownership" -- every system needs exactly one owning team
- Enabling teams that become permanent are actually platform teams in disguise -- sunset or reclassify

## Verification

- Every team can describe their mission in one sentence (clear purpose)
- No system is owned by zero teams or two teams (single clear owner)
- Teams can deploy independently without coordinating with other teams for most changes
- Cognitive load is assessed periodically (quarterly) using concrete signals (on-call pages, context switches)
- Interaction modes between teams are explicitly defined and reviewed when friction emerges
