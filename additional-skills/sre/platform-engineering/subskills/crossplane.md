---
type: subskill
title: "Crossplane"
---

# Crossplane

Compositions, XRDs, provider configurations for infrastructure as code via Kubernetes API.

## When to Load
- Building platform abstractions with Crossplane
- Writing Compositions and CompositeResourceDefinitions (XRDs)
- Configuring cloud providers for Crossplane
- Designing self-service infrastructure for developers

## Key Concepts

**Crossplane model:**
- Managed Resources: 1:1 mapping to cloud resources (like Terraform resources)
- Compositions: combine multiple managed resources into one abstraction
- XRDs (CompositeResourceDefinitions): define the schema for custom abstractions
- Claims: namespace-scoped way for developers to request infrastructure

**Flow:** Developer creates Claim -> matches XRD -> resolves to Composition -> provisions Managed Resources.

**Providers:** Crossplane providers manage cloud APIs. provider-aws, provider-gcp, provider-azure, provider-kubernetes, provider-helm.

## Patterns

**XRD (schema for a database claim):**
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdatabases.platform.company.com
spec:
  group: platform.company.com
  names:
    kind: XDatabase
    plural: xdatabases
  claimNames:
    kind: Database
    plural: databases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                engine: { type: string, enum: [postgres, mysql] }
                size: { type: string, enum: [small, medium, large] }
                region: { type: string }
              required: [engine, size]
```

**Composition (implements the XRD):**
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: xdatabase-aws
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.company.com/v1alpha1
    kind: XDatabase
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.crossplane.io/v1alpha1
        kind: Instance
        spec:
          forProvider:
            dbInstanceClass: db.t3.medium
            engine: postgres
            masterUsername: admin
            allocatedStorage: 20
            publiclyAccessible: false
          providerConfigRef:
            name: aws-provider
      patches:
        - fromFieldPath: spec.engine
          toFieldPath: spec.forProvider.engine
        - fromFieldPath: spec.size
          toFieldPath: spec.forProvider.dbInstanceClass
          transforms:
            - type: map
              map:
                small: db.t3.medium
                medium: db.r6g.large
                large: db.r6g.xlarge
```

**Developer claim (simple interface):**
```yaml
apiVersion: platform.company.com/v1alpha1
kind: Database
metadata:
  name: orders-db
  namespace: team-commerce
spec:
  engine: postgres
  size: medium
  region: us-east-1
```

## Gotchas
- Provider CRDs are large -- thousands of CRDs can stress the API server
- Composition patches are ordered -- later patches override earlier ones
- Deletion policy defaults to Delete -- set to Orphan if you want to keep cloud resources
- Crossplane reconciliation can be slow for complex compositions (many resources)
- XRD schema changes require careful versioning -- breaking changes affect all claims
- Provider credentials rotation needs ProviderConfig update

## Verification
- `kubectl get managed` for all Crossplane-managed resources and their sync status
- `kubectl get composite` for composite resource state
- `kubectl describe <claim>` for events and conditions
- `crossplane beta trace <claim>` for full resource tree visualization
- Provider pod logs for API errors: `kubectl logs -n crossplane-system`
- `kubectl get providerrevisions` for provider version status
