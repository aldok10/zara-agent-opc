---
name: platform-engineering
description: "Internal developer platforms: golden paths, self-service infrastructure, Backstage, score.dev"
---

# Platform Engineering

Internal developer platforms that provide golden paths, self-service infrastructure, and developer experience tooling.

## Scope

Covers platform design philosophy (golden paths over golden cages), Backstage software catalog and scaffolding, Score.dev workload specification, self-service infrastructure provisioning (Crossplane, Terraform modules), developer portal UX, and platform API contracts. Focus on reducing cognitive load while maintaining production standards.

## First Action

When loaded: check for existing Backstage instance (`catalog-info.yaml` in repos), identify IaC module registry, and review developer onboarding documentation for current golden path definitions.

## Constraints

1. Golden paths are paved roads, not walls -- developers can deviate with documented trade-offs
2. Every golden path includes: template, CI/CD pipeline, observability, security baseline
3. Backstage Software Catalog is the service registry of record
4. Score.dev workload spec decouples developer intent from platform implementation
5. Self-service provisioning must complete in < 10 minutes for standard resources
6. Platform APIs versioned with OpenAPI spec; breaking changes require deprecation period
7. All templates produce code that passes security scan and lint on first generation
8. Infrastructure modules expose only necessary knobs; sensible defaults for 90% case
9. Platform team measures: onboarding time, deployment frequency, change failure rate
10. Documentation lives next to code (docs-as-code); no separate wiki for platform guides
11. Every platform capability has a "escape hatch" for advanced use cases
12. Crossplane compositions for cloud resources; raw Terraform only for platform team
13. Service scaffolding includes OTel instrumentation, health endpoints, and SLO definitions
14. Platform changes rolled out progressively: canary team -> early adopters -> all

## DO NOT

1. Force developers into a single language/framework without business justification
2. Build custom solutions when CNCF projects exist (prefer Backstage over homegrown portals)
3. Expose raw cloud console access as "self-service" (abstract through platform APIs)
4. Ship platform features without developer feedback loop (alpha/beta/GA lifecycle)
5. Create golden paths that bypass security controls
6. Require developers to understand Kubernetes to deploy their services
7. Build platform tooling without dogfooding it on platform team services first
8. Measure platform success by features shipped instead of developer outcomes
9. Gate all infrastructure changes on platform team review (trust the guardrails)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| GCP resource provisioning | sre-gcp | Crossplane/TF module design |
| Observability onboarding | sre-observability | OTel SDK golden path |
| Security baseline for templates | sre-security-ops | Pod security, scanning integration |
| Network exposure for services | sre-networking | Gateway API, DNS automation |
| Platform infrastructure cost | sre-cost-optimization | Shared resource efficiency |

## Verification

- [ ] Service scaffolding produces deployable service in < 10 minutes
- [ ] Backstage catalog has all production services registered
- [ ] Score.dev workload specs deploy successfully to all environments
- [ ] Golden path templates pass security scan without modifications
- [ ] Developer satisfaction survey > 4.0/5.0 on platform tooling
- [ ] Self-service provisioning SLO: 95% requests complete within time budget
- [ ] Platform API documentation current and auto-generated from spec

## Knowledge

- knowledge/backstage-catalog-design.md
- knowledge/score-workload-spec.md
- knowledge/crossplane-compositions.md
- knowledge/golden-path-templates.md
- knowledge/platform-metrics.md

## AI-Era Context (2026)

- Backstage is the de facto CNCF developer portal; plugin ecosystem covers most needs
- Score.dev provides platform-agnostic workload definition (deploy to K8s, Cloud Run, etc.)
- Crossplane v2 compositions support conditional logic and function pipelines
- AI-assisted scaffolding generates service code from natural language descriptions
- Platform orchestrators (Humanitec, Kratix) automate resource graph resolution
- Port.dev and Backstage converging on self-service UI patterns
- Internal developer platforms measured by DORA metrics improvement, not feature count
- LLM-powered developer assistants integrated into platform portals for troubleshooting

## Related Skills

- sre-gcp
- sre-observability
- sre-security-ops
- sre-networking
