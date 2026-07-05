---
type: fact
title: "Backstage Patterns"
---

# Backstage Patterns

Backstage software catalog, scaffolding, and plugin patterns for internal developer portals.

## Software Catalog

The catalog is the service registry of record. Every production service, library, infrastructure component, and team lives here.

### Entity Types

| Kind | Purpose | Example |
|------|---------|---------|
| Component | Service, library, website | payment-api, shared-utils |
| API | Interface definition | payment-api-rest, order-grpc |
| Resource | Infrastructure dependency | payment-db, redis-cache |
| System | Group of related components | checkout-system |
| Domain | Business domain boundary | payments, orders |
| Group | Team or organizational unit | platform-team |
| User | Individual engineer | jane.doe |

### Catalog Info File

Every repository contains `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-api
  description: "Processes payment transactions"
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: org/payment-api
    grafana/dashboard-selector: "service_name=payment-api"
    pagerduty.com/service-id: P123ABC
    backstage.io/kubernetes-id: payment-api
  tags:
    - go
    - grpc
    - tier-1
  links:
    - url: https://grafana.internal/d/payment-api
      title: Dashboard
      icon: dashboard
spec:
  type: service
  lifecycle: production
  owner: group:payments-team
  system: checkout-system
  providesApis:
    - payment-api-rest
    - payment-api-grpc
  consumesApis:
    - fraud-detection-api
    - notification-api
  dependsOn:
    - resource:payment-db
    - resource:payment-redis
```

### Discovery and Ingestion

Catalog population strategies:

1. **Static registration**: manually add repos to `app-config.yaml` locations
2. **GitHub discovery**: auto-discover all repos matching pattern (`org/*/catalog-info.yaml`)
3. **Entity provider**: custom plugin that syncs from external source (CMDB, Terraform state)

Recommended: GitHub discovery + entity providers for infrastructure resources.

### Catalog Completeness

Track metadata quality:

| Field | Required | Why |
|-------|----------|-----|
| owner | Yes | Incident routing, review assignment |
| lifecycle | Yes | Distinguish prod from deprecated |
| system | Yes | Understand relationships |
| tags | Yes | Search and filtering |
| annotations.pagerduty | For tier-1 | Incident escalation |
| annotations.grafana | For services | Observability deep-link |
| providesApis | For services | API documentation link |

Dashboard showing catalog completeness per team drives adoption.

## Software Templates

### Template Structure

```
templates/
  new-go-service/
    template.yaml       # Template definition (parameters, steps)
    skeleton/           # Cookiecutter/Nunjucks template files
      catalog-info.yaml
      Dockerfile
      cmd/
        main.go.njk
      internal/
        ...
```

### Template Definition

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: new-go-service
  title: Go Microservice
  description: "Creates a production-ready Go service with OTel, health checks, and CI/CD"
  tags:
    - go
    - recommended
spec:
  owner: group:platform-team
  type: service
  parameters:
    - title: Service Info
      required: [name, team]
      properties:
        name:
          title: Service Name
          type: string
          pattern: "^[a-z][a-z0-9-]*$"
          maxLength: 40
        team:
          title: Owning Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group
        description:
          title: Description
          type: string
          maxLength: 200

    - title: Infrastructure
      properties:
        serviceType:
          title: Service Type
          type: string
          enum: [api, worker, scheduled]
          default: api
        database:
          title: Database
          type: string
          enum: [none, postgresql, redis, both]
          default: none

  steps:
    - id: fetch-skeleton
      name: Generate code
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          team: ${{ parameters.team }}
          serviceType: ${{ parameters.serviceType }}

    - id: publish
      name: Create repository
      action: publish:github
      input:
        repoUrl: github.com?owner=org&repo=${{ parameters.name }}
        defaultBranch: main
        protectDefaultBranch: true

    - id: create-namespace
      name: Provision namespace
      action: kubernetes:apply
      input:
        manifest:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: ${{ parameters.team }}

    - id: register
      name: Register in catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
```

## Plugin Ecosystem

### Essential Plugins (2026)

| Plugin | Purpose | Value |
|--------|---------|-------|
| TechDocs | Documentation-as-code | Docs live with code, searchable in portal |
| Kubernetes | Cluster dashboard | Pod status, logs, events per service |
| PagerDuty | Incident context | On-call, recent incidents visible in catalog |
| GitHub Actions | CI/CD visibility | Build status, deploy history |
| Grafana | Observability links | Dashboards embedded in entity page |
| SonarQube/Snyk | Security findings | Vulnerability count per service |
| Cost Insights | Cloud cost | Per-service cost attribution |
| Scaffolder | Templates | Service creation wizard |

### Custom Plugin Development

When to build custom:
- Internal tooling with no open-source equivalent
- Deep integration with proprietary systems
- Workflow automation specific to your organization

Plugin types:
- **Frontend**: React components rendered in entity pages
- **Backend**: Express routes serving data to frontend plugins
- **Backend module**: extends existing backend plugin (new catalog provider, new scaffolder action)

### Search Integration

Backstage Search provides unified search across:
- Catalog entities (services, APIs, teams)
- TechDocs content (documentation text)
- Stack Overflow for Teams (if integrated)
- Custom search collators for internal tools

## Deployment Model

### Self-hosted (recommended for 2026)
- Backstage deployed as container in Kubernetes
- PostgreSQL backend for catalog storage
- GitHub/GitLab OAuth for authentication
- RBAC via permission framework (Backstage 1.20+)

### Operational Considerations
- Backstage itself needs SLO (it's a developer tool, downtime hurts productivity)
- Database backup daily (catalog state is important)
- Plugin updates monthly (security patches, new features)
- Template testing in CI (every template change verified by running scaffolder)

## Governance

### Catalog Ownership Rules
- Every entity must have an owner
- Owners must be active groups (not individuals)
- Orphaned entities (owner group deleted) flagged weekly
- Deprecated services must have migration guide or sunset date

### Template Governance
- Platform team approves new templates (quality gate)
- Templates tested via automated scaffolding in CI
- Generated code must pass lint + security scan on first generation
- Template deprecation: 30-day notice, migration path documented
