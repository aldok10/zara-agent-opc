# Platform Engineering

Internal developer platforms, golden paths, and self-service infrastructure patterns.

## Internal Developer Platforms (IDP)

### What

A self-service layer that abstracts infrastructure complexity, letting developers ship without needing deep ops knowledge. Not a product you buy -- it's a capability you build by integrating existing tools.

### Why

- Reduce cognitive load on product teams.
- Standardize workflows without restricting flexibility.
- Decrease time-to-production for new services.
- Enforce security and compliance as defaults, not afterthoughts.
- Reduce "works on my machine" and environment drift.

### Who builds it

Platform engineering teams (not DevOps renamed). They treat the platform as a product with internal customers (development teams). Product management practices apply: user research, roadmaps, feedback loops, SLOs.

## Golden Paths

Opinionated, well-supported paths for common workflows. Not mandates -- escape hatches exist, but deviating means you own the complexity.

### Examples

| Workflow | Golden path | Escape hatch |
|----------|-------------|--------------|
| New service | Template with CI/CD, observability, IAM | Custom Dockerfile + manual pipeline |
| Database | Managed Postgres via platform API | Self-managed on VMs |
| Deployment | Push to main, auto-deploy via ArgoCD | Manual kubectl apply |
| Secrets | Platform secret store (Vault) | Cloud-native KMS with custom integration |

### Design principles

1. Minimize decisions for the 80% case.
2. Progressive disclosure: simple defaults, advanced knobs available.
3. Documentation at the point of use (inline, not wikis).
4. Measure adoption voluntarily -- forcing golden paths defeats the purpose.
5. Version golden paths like APIs. Breaking changes need migration guides.

## Backstage (Spotify)

Open-source developer portal. Four pillars:

### Software catalog

Central registry of all services, libraries, APIs, resources. Each entity has a `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles payment processing
  annotations:
    github.com/project-slug: org/payment-service
    pagerduty.com/service-id: P123ABC
spec:
  type: service
  lifecycle: production
  owner: team-payments
  system: checkout
  dependsOn:
    - resource:payments-db
    - component:auth-service
  providesApis:
    - payments-api
```

### Software templates

Scaffolding new projects with golden path defaults:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: node-service
  title: Node.js Microservice
spec:
  parameters:
    - title: Service Info
      properties:
        name:
          type: string
        owner:
          type: string
          ui:field: OwnerPicker
  steps:
    - id: fetch
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
    - id: publish
      action: publish:github
    - id: register
      action: catalog:register
```

### TechDocs

Documentation-as-code. Markdown in repo, rendered in Backstage:

```yaml
# mkdocs.yml in service repo
site_name: Payment Service
nav:
  - Home: index.md
  - API: api.md
  - Runbook: runbook.md
plugins:
  - techdocs-core
```

### Plugins

Extensible architecture. 200+ community plugins: PagerDuty, Kubernetes, ArgoCD, Grafana, SonarQube, cost estimation. Custom plugins for internal systems.

## Crossplane

Kubernetes-native infrastructure management. Define cloud resources as Kubernetes custom resources.

### Compositions

Package multiple resources into a single API:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: postgres-standard
spec:
  compositeTypeRef:
    apiVersion: database.platform.io/v1alpha1
    kind: PostgresInstance
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            engine: postgres
            engineVersion: "16"
            instanceClass: db.t3.medium
            allocatedStorage: 20
    - name: security-group
      base:
        apiVersion: ec2.aws.upbound.io/v1beta1
        kind: SecurityGroup
```

### Composite Resource Definitions (XRDs)

Define the API that developers interact with:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: postgresinstances.database.platform.io
spec:
  group: database.platform.io
  names:
    kind: PostgresInstance
  versions:
    - name: v1alpha1
      schema:
        openAPIV3Schema:
          properties:
            spec:
              properties:
                size:
                  type: string
                  enum: [small, medium, large]
                version:
                  type: string
                  default: "16"
```

Developer request:

```yaml
apiVersion: database.platform.io/v1alpha1
kind: PostgresInstance
metadata:
  name: payments-db
spec:
  size: medium
  version: "16"
```

### Why Crossplane

- Kubernetes-native: use familiar tooling (kubectl, GitOps, RBAC).
- Cloud-agnostic abstractions via XRDs.
- Drift detection and reconciliation (Kubernetes control loop).
- Team-level self-service without cloud console access.

## Score.dev

Workload specification that decouples what developers need from how it's provisioned.

```yaml
apiVersion: score.dev/v1b1
metadata:
  name: payment-service
containers:
  main:
    image: .
    variables:
      DB_HOST: ${resources.db.host}
      DB_PORT: ${resources.db.port}
resources:
  db:
    type: postgres
  queue:
    type: redis
```

Translators generate platform-specific manifests (Docker Compose for local, Helm for staging, Terraform for prod). Developers describe intent; platform decides implementation.

## Developer Experience Metrics

### SPACE framework (GitHub research)

| Dimension | Example metrics |
|-----------|----------------|
| **S**atisfaction | Developer survey scores, NPS |
| **P**erformance | Code review turnaround, incident MTTR |
| **A**ctivity | Commits, PRs merged, deployments (use carefully) |
| **C**ommunication | PR review quality, knowledge sharing |
| **E**fficiency | Build time, deploy time, onboarding time |

Never use a single dimension in isolation. Activity without context is meaningless.

### DX Core 4 (DX research)

1. **Speed**: how fast can developers ship?
2. **Effectiveness**: does shipped code work?
3. **Quality of experience**: how painful is the process?
4. **Impact**: does dev work move business metrics?

### Measuring platform success

- **Adoption rate**: % of teams on golden path (voluntary, not forced).
- **Time-to-first-deploy**: new service from template to production.
- **Cognitive load survey**: do developers feel they need to know less ops?
- **Support ticket volume**: decreasing tickets = better self-service.
- **DORA metrics**: deployment frequency, lead time, MTTR, change failure rate.

## Self-Service Infrastructure Patterns

### Catalog-driven provisioning

Developer browses catalog > selects template > fills parameters > automation provisions resources + configures CI/CD + registers in catalog.

### API-driven infrastructure

Expose infrastructure as internal APIs:

```
POST /api/v1/databases
{
  "name": "payments-db",
  "engine": "postgres",
  "size": "medium",
  "team": "payments"
}
```

Backed by Terraform/Crossplane/Pulumi. Abstracts cloud specifics.

### GitOps-driven

Infrastructure defined in git. PRs trigger plan/preview. Merge triggers apply. ArgoCD or Flux for Kubernetes. Atlantis or Spacelift for Terraform.

### Guardrails not gates

- Policy-as-code (OPA, Kyverno, Sentinel) enforces rules automatically.
- Cost budgets: warn or block over-provisioning.
- Security baselines: default encryption, network policies, IAM boundaries.
- Teams get autonomy within boundaries. No ticket-based approval for standard requests.

## Platform Team Topology

Based on Team Topologies (Skelton & Pais):

- **Platform team**: builds and maintains the IDP. Treats it as a product.
- **Enabling team**: helps stream-aligned teams adopt platform capabilities. Temporary engagement, not permanent dependency.
- **Stream-aligned teams**: product teams that consume the platform. Primary customers.

### Anti-patterns

- Platform team becomes a bottleneck (ticket-driven, not self-service).
- Building before validating need (over-engineering, unused features).
- Mandating platform use without providing value.
- No product management (no roadmap, no user research, no feedback).

### Success patterns

- Thin platform: integrate existing tools rather than rebuilding.
- Start with pain: solve the problems teams actually complain about.
- Measure adoption, not enforcement.
- Platform as optional accelerator, not mandatory gate.
