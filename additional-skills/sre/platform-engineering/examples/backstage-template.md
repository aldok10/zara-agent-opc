---
type: example
title: "Backstage Service Template"
---

# Backstage Service Template (New Microservice)

## Context
When platform teams need to standardize how new services get created. Backstage software templates codify golden paths: the right folder structure, CI/CD, observability, and security defaults from day one. Developers fill a form, get a production-ready repo.

## Code/Template

```yaml
# templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: production-microservice
  title: Production Microservice
  description: |
    Creates a new microservice with CI/CD pipeline, observability,
    security scanning, and deployment to Kubernetes.
  tags:
    - recommended
    - golang
    - kubernetes
spec:
  owner: platform-team
  type: service

  parameters:
    - title: Service Details
      required:
        - name
        - description
        - owner
      properties:
        name:
          title: Service Name
          type: string
          description: Lowercase, hyphens allowed (e.g., payment-processor)
          pattern: '^[a-z][a-z0-9-]{2,30}$'
          ui:autofocus: true
        description:
          title: Description
          type: string
          maxLength: 200
        owner:
          title: Owning Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group
    - title: Technical Options
      properties:
        language:
          title: Language
          type: string
          enum: ['go', 'typescript', 'python']
          default: 'go'
        database:
          title: Database
          type: string
          enum: ['none', 'postgresql', 'redis']
          default: 'none'
        isPublicApi:
          title: Exposes Public API
          type: boolean
          default: false
    - title: Infrastructure
      properties:
        environment:
          title: Initial Environments
          type: array
          items:
            type: string
            enum: ['staging', 'production']
          default: ['staging']
          uniqueItems: true

  steps:
    # Step 1: Fetch skeleton and render templates
    - id: fetch-skeleton
      name: Fetch service skeleton
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          language: ${{ parameters.language }}
          database: ${{ parameters.database }}
          isPublicApi: ${{ parameters.isPublicApi }}

    # Step 2: Create GitHub repository
    - id: publish-repo
      name: Create GitHub repository
      action: publish:github
      input:
        repoUrl: github.com?repo=${{ parameters.name }}&owner=our-org
        description: ${{ parameters.description }}
        defaultBranch: main
        protectDefaultBranch: true
        requireCodeOwnerReviews: true
        repoVisibility: internal
        collaborators:
          - team: ${{ parameters.owner }}
            access: admin
          - team: platform-team
            access: maintain

    # Step 3: Register in Backstage catalog
    - id: register-catalog
      name: Register in catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['publish-repo'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

    # Step 4: Create ArgoCD application
    - id: create-argocd-app
      name: Create ArgoCD deployment
      action: argocd:create-resources
      input:
        appName: ${{ parameters.name }}
        argoInstance: production
        namespace: ${{ parameters.name }}
        repoUrl: ${{ steps['publish-repo'].output.remoteUrl }}
        path: deploy/k8s

    # Step 5: Set up monitoring
    - id: create-datadog-monitors
      name: Create Datadog monitors
      action: http:backstage:request
      input:
        method: POST
        path: /api/proxy/datadog/api/v1/monitor
        headers:
          Content-Type: application/json
        body:
          name: "${{ parameters.name }} - High Error Rate"
          type: metric alert
          query: "sum(last_5m):sum:http.requests{service:${{ parameters.name }},status:5xx}.as_count() / sum:http.requests{service:${{ parameters.name }}}.as_count() > 0.05"
          message: "@pagerduty-${{ parameters.owner }} High 5xx rate on ${{ parameters.name }}"

  output:
    links:
      - title: Repository
        url: ${{ steps['publish-repo'].output.remoteUrl }}
      - title: Service in Catalog
        icon: catalog
        entityRef: ${{ steps['register-catalog'].output.entityRef }}
      - title: ArgoCD Application
        url: https://argocd.internal/applications/${{ parameters.name }}
```

```yaml
# templates/microservice/skeleton/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.name }}
  description: ${{ values.description }}
  annotations:
    github.com/project-slug: our-org/${{ values.name }}
    argocd/app-name: ${{ values.name }}
    datadoghq.com/service-name: ${{ values.name }}
    pagerduty.com/service-id: TODO
  tags:
    - ${{ values.language }}
    {%- if values.database != 'none' %}
    - ${{ values.database }}
    {%- endif %}
spec:
  type: service
  lifecycle: experimental
  owner: ${{ values.owner }}
  {%- if values.isPublicApi %}
  providesApis:
    - ${{ values.name }}-api
  {%- endif %}
  {%- if values.database == 'postgresql' %}
  dependsOn:
    - resource:${{ values.name }}-db
  {%- endif %}
```

## Key Points
- Validate service names with regex patterns in the template—prevents naming inconsistencies that break DNS, K8s labels, and metrics
- Wire up monitoring, catalog registration, and deployment in the same template; a service without observability is invisible
- Set `lifecycle: experimental` by default; teams must explicitly promote to `production` after passing readiness review
