---
type: subskill
title: "Golden Paths"
---

# Golden Paths

Templates, guardrails, and self-service patterns for developer platforms.

## When to Load
- Designing standardized project templates
- Building self-service workflows for developers
- Implementing guardrails without blocking productivity
- Creating paved roads for common use cases

## Key Concepts

**Golden path:** the supported, well-lit way to accomplish a task. Not enforced -- developers can diverge, but the golden path has the best tooling, documentation, and support.

**Components:**
- Templates: scaffolding for new services (cookiecutter, Backstage templates)
- Guardrails: automated policy checks (OPA, Kyverno, SCPs)
- Self-service: portals/CLIs for provisioning without tickets
- Documentation: embedded in the flow, not a separate wiki

**Guardrail types:**
- Preventive: block non-compliant actions (admission controllers, SCPs)
- Detective: alert on drift (Config rules, policy scanners)
- Corrective: auto-remediate (auto-tagging, drift reconciliation)

## Patterns

**Service template structure:**
```
templates/
  go-service/
    skeleton/
      cmd/server/main.go
      internal/
      Dockerfile
      .github/workflows/ci.yaml
      terraform/
      Makefile
    template.yaml  # metadata + parameters
  
  python-service/
    skeleton/
      src/
      tests/
      Dockerfile
      pyproject.toml
    template.yaml
```

**Self-service catalog entry (Backstage):**
```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: go-microservice
  title: Go Microservice
  description: Production-ready Go service with CI/CD
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Service Info
      required: [name, owner]
      properties:
        name: { type: string, pattern: "^[a-z][a-z0-9-]+$" }
        owner: { type: string, ui:field: OwnerPicker }
        tier: { type: string, enum: [critical, standard, experimental] }
  steps:
    - id: fetch-template
      action: fetch:template
      input: { url: ./skeleton, values: { name: ${{ parameters.name }} } }
    - id: create-repo
      action: publish:github
      input: { repoUrl: github.com?repo=${{ parameters.name }}&owner=org }
    - id: register
      action: catalog:register
      input: { repoContentsUrl: ${{ steps.create-repo.output.repoContentsUrl }} }
```

**Guardrail with OPA/Gatekeeper:**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds: [{ apiGroups: ["apps"], kinds: ["Deployment"] }]
  parameters:
    labels: ["team", "tier", "cost-center"]
```

## Gotchas
- Too many templates cause confusion -- start with 3-5 covering 80% of use cases
- Templates without maintenance rot quickly -- assign owners, schedule reviews
- Guardrails that block without explanation create frustration and workarounds
- Self-service without audit trail creates security gaps
- Golden paths that diverge from what teams actually use get ignored
- Template versioning is critical -- breaking changes cascade to all consumers

## Verification
- Track template adoption rate (% new services using golden path)
- Measure time-to-production for templated vs custom services
- Policy violation trends (should decrease over time)
- Developer satisfaction surveys (NPS or CSAT for platform)
- Drift detection: how many services diverged from template baseline
