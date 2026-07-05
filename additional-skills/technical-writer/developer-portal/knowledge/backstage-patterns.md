---
type: fact
title: "Backstage IDP Patterns"
---

# Backstage IDP Patterns

Spotify's open-source internal developer portal: software catalog, templates, plugins, and TechDocs.

## Software Catalog

Central registry of all software components and their ownership:

### Entity Model

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-api
  description: Processes payment transactions
  annotations:
    github.com/project-slug: org/payment-api
    pagerduty.com/service-id: P123ABC
  tags:
    - go
    - grpc
    - tier-1
spec:
  type: service
  lifecycle: production
  owner: team-payments
  system: payments
  dependsOn:
    - resource:payment-db
    - component:fraud-detector
  providesApis:
    - payment-api
```

### Entity Types

| Kind | Purpose | Example |
|------|---------|---------|
| Component | Software (service, library, website) | payment-api |
| API | Interface definition | payment-api (OpenAPI spec) |
| Resource | Infrastructure dependency | payment-db, redis-cache |
| System | Collection of related components | payments-system |
| Domain | Business domain grouping | commerce |
| Group | Team or organizational unit | team-payments |
| User | Individual contributor | alice |

### Discovery Methods

- **Static YAML**: catalog-info.yaml in each repo root
- **GitHub discovery**: auto-discover repos matching patterns
- **API-driven**: register entities programmatically via catalog API
- **Processors**: custom logic to enrich entities from external sources

## Software Templates

Scaffolding new projects with golden paths:

### Template Structure

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: go-microservice
  title: Go Microservice
  description: Creates a new Go service with CI/CD, observability, and deployment config
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Service Info
      required: [name, owner]
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]*$'
        owner:
          title: Owner Team
          type: string
          ui:field: OwnerPicker
        tier:
          title: Service Tier
          type: string
          enum: [tier-1, tier-2, tier-3]
          default: tier-2
  steps:
    - id: fetch
      name: Fetch skeleton
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}
    - id: publish
      name: Create repository
      action: publish:github
      input:
        repoUrl: github.com?owner=org&repo=${{ parameters.name }}
    - id: register
      name: Register in catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
```

### Template Design Principles

- Include all golden path defaults (CI/CD, Dockerfile, observability, health checks)
- Use parameters to capture only what varies (name, owner, tier)
- Register output in catalog automatically (close the loop)
- Version templates  -  breaking changes need migration guides
- Test templates in CI (render + validate output structure)

## Plugin Architecture

Backstage extends via plugins:

### Plugin Categories

| Category | Examples | Value |
|----------|----------|-------|
| CI/CD | GitHub Actions, Jenkins, ArgoCD | Build status in catalog |
| Monitoring | Grafana, Datadog, PagerDuty | Dashboards per-service |
| Security | Snyk, SonarQube, Dependabot | Vulnerability visibility |
| Cloud | AWS, GCP, Kubernetes | Resource status |
| Documentation | TechDocs, API docs | Docs alongside code |
| Cost | Kubecost, AWS Cost Explorer | Per-service spending |

### Custom Plugin Pattern

```typescript
// plugins/my-plugin/src/plugin.ts
import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

export const myPlugin = createPlugin({
  id: 'my-plugin',
  routes: {
    root: rootRouteRef,
  },
});

export const MyPluginPage = myPlugin.provide(
  createRoutableExtension({
    name: 'MyPluginPage',
    component: () => import('./components/MainPage').then(m => m.MainPage),
    mountPoint: rootRouteRef,
  }),
);
```

### Plugin Selection Criteria

- Does it solve a real friction point for developers?
- Is it maintained (check last commit, open issues)?
- Does it require external service access (security review needed)?
- Can the same information be shown via a simpler annotation or link?

## TechDocs

Documentation-as-code rendered in Backstage:

### How It Works

1. Write docs in Markdown alongside code (in `/docs` directory)
2. Configure `mkdocs.yml` in repo root
3. TechDocs builds static site from Markdown
4. Rendered and served within Backstage portal

### Configuration

```yaml
# mkdocs.yml
site_name: Payment API
nav:
  - Home: index.md
  - Architecture: architecture.md
  - API Reference: api.md
  - Runbooks:
      - Incident Response: runbooks/incidents.md
      - Deployment: runbooks/deploy.md
plugins:
  - techdocs-core
```

### Build Modes

| Mode | When | Trade-off |
|------|------|-----------|
| Local builder | Small deployments (<50 docs sites) | Simple but slow at scale |
| External builder | CI/CD builds docs on merge | Scales well, slight delay on updates |
| Recommended builder | CI builds + object storage (S3/GCS) | Production-grade, separated concerns |

## Operational Patterns

### Catalog Freshness

- Require `catalog-info.yaml` in all repos (enforce via CI check)
- Automated PR to update metadata when dependency graph changes
- Scorecard: penalize entities missing required annotations
- Orphan detection: flag entities whose source repo is archived

### Adoption Strategy

1. Start with catalog only (register all existing services)
2. Add 1-2 high-value plugins (PagerDuty, CI status)
3. Create first template for most common new-service pattern
4. Enable TechDocs for tier-1 services
5. Measure: portal visits, template usage, time-to-first-deploy

### Scaling Concerns

- Backstage is a frontend app  -  backend plugins add load
- PostgreSQL backend required for production (SQLite only for dev)
- Search (Elasticsearch/Lunr) needed when catalog exceeds ~200 entities
- Authentication: integrate with existing SSO (Okta, Google, GitHub)

## Anti-Patterns

- Catalog with no ownership data (registry without accountability)
- Templates that are never updated (new services start with stale patterns)
- Too many plugins (portal becomes slow and confusing)
- TechDocs without review process (stale docs render trust)
- Building Backstage features that belong in CI/CD or monitoring tools
- No adoption metrics (building a portal nobody visits)
