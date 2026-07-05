---
type: subskill
title: "Developer Portals & Service Catalogs"
---

# Developer Portals & Service Catalogs

Single pane of glass for all services: documentation, ownership, health, and self-service actions. Replaces tribal knowledge and tickets.

## Core Components

- **Service catalog**: who owns what, dependencies, tech stack
- **TechDocs**: documentation living alongside code
- **Scorecards**: production readiness checks
- **Search**: find any service, doc, or API fast
- **Self-service actions**: provision without tickets

## Tool Selection

- **Backstage** (open-source, CNCF): plugin-based, React frontend, Node backend, YAML catalog, fully extensible. Best for teams wanting full control with strong frontend skills.
- **Port** (SaaS): entity-model based, no-code self-service, blueprints, scorecards, automations. Best for fast setup with limited portal engineering bandwidth.
- **Cortex** (SaaS): focused on scorecards and engineering maturity. Best for measuring production readiness at scale.
- **OpsLevel** (SaaS): service ownership, maturity rubrics, checks. Best for large orgs with ownership problems.

## Catalog-as-Code

Define services in YAML (`catalog-info.yaml`), auto-discover from GitHub/GitLab. Git is the source of truth.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments-api
  annotations:
    backstage.io/techdocs-ref: dir:.
spec:
  type: service
  lifecycle: production
  owner: team-payments
  dependsOn: [resource:payments-db]
```

## Scorecards

Production readiness checklist that drives adoption through visibility: has docs? has tests? has on-call? has SLO? has security scan? Public scores create healthy peer pressure.

## Self-Service Actions

Replace tickets with buttons: create new service, provision database, rotate secrets, deploy to staging, request access.

## Implementation Order

Catalog first (immediate value) -> TechDocs -> scorecards -> self-service actions -> custom plugins.

## Anti-Patterns

- Portal without data (empty catalog kills trust)
- Building without users in mind
- Over-customizing before proving value
- No governance (stale, rotting catalog entries)
