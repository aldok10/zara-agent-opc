---
type: subskill
title: "Backstage"
---

# Backstage

Software catalog, templates, plugins, and TechDocs for internal developer portals.

## When to Load
- Setting up or extending a Backstage instance
- Building custom plugins for internal tools
- Configuring the software catalog
- Implementing TechDocs for documentation

## Key Concepts

**Backstage core features:**
- Software Catalog: service registry with ownership, dependencies, APIs
- Templates (Scaffolder): self-service project creation
- TechDocs: docs-as-code rendered in the portal
- Plugins: extend with custom UI and backend logic
- Search: unified search across catalog, docs, and plugins

**Catalog model:** Entities (Component, API, Resource, System, Domain, Group, User). Relations connect them (ownedBy, consumesApi, dependsOn).

**Entity descriptor (catalog-info.yaml):** lives in each repo, declares the entity and its metadata.

## Patterns

**catalog-info.yaml for a service:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: order-service
  description: Handles order lifecycle
  annotations:
    github.com/project-slug: org/order-service
    backstage.io/techdocs-ref: dir:.
  tags: [go, grpc, production]
  links:
    - url: https://grafana.internal/d/orders
      title: Dashboard
spec:
  type: service
  lifecycle: production
  owner: team-commerce
  system: commerce-platform
  providesApis: [order-api]
  consumesApis: [payment-api, inventory-api]
  dependsOn: [resource:orders-db, resource:orders-cache]
```

**API entity:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: order-api
  description: Order management API
spec:
  type: grpc
  lifecycle: production
  owner: team-commerce
  system: commerce-platform
  definition:
    $text: ./proto/order.proto
```

**Custom backend plugin (basic structure):**
```typescript
import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './router';

export const myPlugin = createBackendPlugin({
  pluginId: 'my-plugin',
  register(env) {
    env.registerInit({
      deps: { http: coreServices.httpRouter, logger: coreServices.logger },
      async init({ http, logger }) {
        http.use(await createRouter({ logger }));
      },
    });
  },
});
```

**TechDocs configuration (mkdocs.yml in repo):**
```yaml
site_name: Order Service
nav:
  - Home: index.md
  - Architecture: architecture.md
  - Runbook: runbook.md
  - API Reference: api.md
plugins:
  - techdocs-core
```

## Gotchas
- Catalog ingestion can be slow at scale -- use incremental processing
- Entity references must match exactly (case-sensitive, namespace-aware)
- TechDocs generation on large docs sites can timeout -- use CI-generated docs
- Plugin API changes between Backstage versions -- pin and test upgrades
- Catalog discovery (GitHub discovery) can flood the catalog with unwanted entities -- use filters
- Authentication: integrate with existing SSO early, not after adoption

## Verification
- `yarn backstage-cli versions:check` for dependency alignment
- Catalog entity count and orphaned entity detection
- TechDocs build: `techdocs-cli generate` locally before pushing
- Plugin health: check backend plugin routes respond
- Search indexing: verify entities appear in search within minutes of creation
