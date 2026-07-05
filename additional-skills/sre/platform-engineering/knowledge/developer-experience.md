---
type: fact
title: "Developer Experience"
---

# Developer Experience

Internal developer platforms, golden paths, and self-service infrastructure for engineering productivity.

## Golden Paths

Opinionated, supported routes through the technology stack:

### Definition

A golden path is the recommended way to accomplish a task, backed by:
- Templates that implement best practices
- Documentation specific to the path
- Tooling that automates the path
- Support from the platform team

### Examples

| Task | Golden Path | Alternative (supported but not recommended) |
|------|------------|----------------------------------------------|
| New service | Template with CI/CD, observability, health checks | Manual setup with custom Dockerfile |
| Database migration | Flyway + PR review + staged rollout | Manual SQL execution |
| Secret management | Vault with injected sidecar | Environment variables in deployment manifest |
| API design | OpenAPI spec → generated server stub | Hand-written handlers |

### Design Principles

- Paths should be easy to follow, not mandatory (guardrails, not gates)
- Cover 80% of use cases; allow escape hatches for the remaining 20%
- Start with the highest-friction developer tasks (new service setup, environment creation)
- Measure adoption: if teams consistently avoid a golden path, the path is wrong

## Internal Developer Platform (IDP)

A platform product built for internal engineering teams:

### Core Capabilities

1. **Service catalog**: what exists, who owns it, what it depends on
2. **Self-service provisioning**: create environments, databases, queues without tickets
3. **Template library**: scaffolding for new services, pipelines, infrastructure
4. **Documentation hub**: centralized, searchable, ownership-tracked docs
5. **API catalog**: available internal APIs with specs and usage examples

### Maturity Levels

| Level | Characteristics |
|-------|----------------|
| Ad-hoc | Tribal knowledge, manual setup, ticket-based requests |
| Standardized | Documented procedures, shared templates, some automation |
| Self-service | Portal-based provisioning, automated golden paths |
| Optimized | Metrics-driven improvement, feedback loops, platform as product |

### Platform Team Operating Model

- Treat the platform as a product: roadmap, user research, feedback cycles
- Platform team size: ~1 platform engineer per 15-25 application developers
- Measure success by developer productivity (time to first commit, deploy frequency)
- Internal SLOs for platform services (template generation < 5 min, environment creation < 10 min)

## Developer Portal

Central entry point for engineering teams:

### Essential Pages

- **Service catalog**: searchable list of all services with ownership, status, dependencies
- **Getting started**: onboarding guides per team role (backend, frontend, data, SRE)
- **Template gallery**: available scaffolds with descriptions and usage instructions
- **API explorer**: interactive documentation for all internal APIs
- **Runbook library**: operational procedures indexed by service and failure mode
- **Architecture decisions**: searchable ADR archive with status and context

### Implementation Options

| Tool | Strengths | Trade-offs |
|------|-----------|------------|
| Backstage | Plugin ecosystem, software catalog, TechDocs | Complex setup, React knowledge needed |
| Port | No-code portal builder, RBAC | SaaS only, less customizable |
| Cortex | Scorecard-driven, maturity tracking | SaaS, opinionated workflow |
| Custom (wiki + scripts) | Full control | Maintenance burden, fragmentation risk |

## Self-Service Patterns

### Environment Creation

Developers should be able to spin up isolated environments without filing tickets:

```yaml
# Example: self-service environment request
kind: Environment
metadata:
  name: feature-payments-v2
  owner: team-payments
  ttl: 7d
spec:
  template: microservice-stack
  services:
    - payment-api
    - payment-worker
  dependencies:
    - postgres (ephemeral)
    - redis (shared-dev)
```

### Resource Provisioning

| Resource | Self-Service Mechanism | Guardrails |
|----------|----------------------|------------|
| Database | Crossplane claim or Terraform module | Size limits, backup policy enforced |
| Queue/topic | Template with naming convention | Retention policy, DLQ required |
| DNS record | PR to config repo, auto-applied | Validation against naming standard |
| TLS certificate | cert-manager with auto-issuance | Expiry alerting, rotation policy |

## Measuring Developer Experience

### DORA Metrics (Team Performance)

- Deployment frequency
- Lead time for changes (commit → production)
- Mean time to recovery
- Change failure rate

### Developer Satisfaction (Qualitative)

Survey quarterly:
- "How easy is it to set up a new service?" (1-5)
- "How long do you wait for environment provisioning?"
- "What is your biggest friction point this quarter?"

### Platform Adoption Metrics

| Metric | Target | Signal |
|--------|--------|--------|
| Golden path adoption | >70% of new services | Templates are useful |
| Self-service vs ticket ratio | >80% self-service | Portal is working |
| Time to first deploy (new hire) | <1 day | Onboarding is smooth |
| Template freshness | Updated within 30 days | Templates stay relevant |

## Anti-Patterns

- Building a platform nobody asked for (solve real pain points first)
- Mandatory enforcement without escape hatches (creates workarounds)
- Platform team as gatekeeper instead of enabler (ticket queue defeats purpose)
- Portal with stale information (worse than no portal)
- Measuring platform success by features shipped instead of developer outcomes
- Ignoring feedback loops ("we know what developers need" without asking them)
