---
type: fact
title: "Golden Paths"
---

# Golden Paths

Internal developer platform golden paths: paved roads that encode best practices without constraining innovation.

## Philosophy

Golden paths are opinionated defaults, not mandates. They answer: "What's the fastest way to ship a production-ready service without making infrastructure decisions?"

Principles:
- **Paved road, not golden cage**: developers can deviate when they have a reason
- **Convention over configuration**: 90% of services need the same thing
- **Batteries included**: observability, security, CI/CD come free with the template
- **Progressive disclosure**: simple by default, advanced knobs available

## Golden Path Components

Every golden path includes these layers:

### Service Template
- Language/framework starter with project structure
- Dockerfile with multi-stage build (minimal final image)
- Health endpoints (/healthz, /readyz, /livez) pre-wired
- OTel instrumentation auto-configured
- Structured logging with correlation IDs
- Error handling and graceful shutdown

### CI/CD Pipeline
- Build, test, scan (SAST + container image)
- Automatic versioning (semantic or SHA-based)
- Deploy to staging on PR merge
- Manual promotion to production (or automated with canary)
- Rollback capability built into every deploy

### Infrastructure
- Kubernetes manifests or Helm chart (generated from Score.dev spec)
- Resource requests/limits pre-configured for service type
- Network policies (default-deny + service-specific allow)
- Secrets management (External Secrets Operator -> Vault/GCP Secret Manager)
- Database/cache provisioning via Crossplane claim

### Observability
- RED metrics dashboard (auto-generated from OTel data)
- SLO definition (default: 99.9% availability, 500ms p99 latency)
- Burn-rate alerts pre-configured
- Distributed tracing with context propagation
- Structured log format with mandatory fields

### Security
- Pod Security Standards: restricted
- Image signing (cosign) integrated into CI
- SBOM generation on every build
- Dependency scanning as CI gate
- Network policy restricting egress to declared dependencies

## Template Design Patterns

### Scaffolding Architecture

```
[Backstage Template] 
  -> [Cookiecutter/Yeoman] generates code
  -> [Git repo created with branch protection]
  -> [CI/CD pipeline auto-configured]
  -> [Backstage catalog-info.yaml included]
  -> [Kubernetes namespace + RBAC provisioned]
  -> [Monitoring dashboards auto-created]
```

### Template Variables

Minimal inputs from developer:
- Service name (kebab-case)
- Team/owner
- Language/framework (from supported list)
- Service type (API, worker, scheduled job)
- Dependencies needed (database, cache, queue)

Everything else derived from conventions:
- Namespace = team name
- Repository = org/service-name
- Domain = service-name.internal (internal) or service-name.example.com (external)
- Resource profile = based on service type (API=small, worker=medium)

### Resource Profiles

Pre-defined sizes to prevent decision fatigue:

| Profile | CPU Request | Memory Request | Replicas | Use Case |
|---------|-------------|----------------|----------|----------|
| small | 100m | 256Mi | 2-4 | API services, BFFs |
| medium | 500m | 1Gi | 2-6 | Worker processes, aggregators |
| large | 2000m | 4Gi | 3-8 | Data processors, ML inference |
| gpu | 1 GPU | 16Gi | 1-2 | Model serving, training jobs |

## Escape Hatches

When golden path doesn't fit:

1. **Override in code**: add `platform.override.yaml` in repo with specific settings
2. **Custom Crossplane claim**: extend base composition with additional resources
3. **Self-managed namespace**: team gets full RBAC, platform team provides less automation
4. **Documentation requirement**: deviation documented in ADR (Architecture Decision Record)

Cost of deviation:
- No more auto-updating templates (team owns maintenance)
- Platform team provides best-effort support (not SLA)
- Team responsible for security scanning and compliance of custom components

## Measuring Golden Path Adoption

| Metric | Target | Meaning |
|--------|--------|---------|
| Adoption rate | > 80% of new services | Path is useful enough to choose |
| Time to first deploy | < 30 minutes | Template actually works end-to-end |
| Deviation rate | < 20% | Defaults cover most needs |
| Satisfaction score | > 4.0/5.0 | Developers find it valuable |
| Template freshness | Updated monthly | Dependencies and practices current |

If adoption < 60%: golden path doesn't match developer needs. Investigate and iterate.
If deviation > 40%: path is too restrictive. Add flexibility or new service types.

## Versioning and Updates

Templates evolve. Handle updates:

1. **New service**: always gets latest template version
2. **Existing service**: opt-in updates via renovate-style PRs
3. **Breaking changes**: announced 30 days ahead, migration guide provided
4. **Platform libraries**: SemVer, existing services get patch/minor auto-updates

Never force-update running services. Pull model only.

## Anti-Patterns

- Template generates code that doesn't compile/run (test templates in CI)
- Asking developers 20+ questions during scaffolding (minimize inputs)
- Golden path that's slower than doing it manually (defeats the purpose)
- No escape hatch (developers will work around you)
- Template last updated 6 months ago (stale dependencies, outdated practices)
- Platform team doesn't use their own templates (no dogfooding = no quality)
