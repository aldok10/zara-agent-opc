---
type: fact
title: "Policy as Code"
---

# Policy as Code

Defining, enforcing, and auditing organizational policies through code using OPA, Sentinel, and Checkov.

## Why Policy as Code

Manual policy enforcement fails because:
- Policies documented in PDFs that nobody reads
- Enforcement depends on individual reviewer knowledge
- Inconsistent application across teams and environments
- Audit evidence is retroactive snapshots, not continuous proof
- Scale makes manual review impossible

Policy as code provides: version control, automated enforcement, testability, auditability, and consistency.

## Open Policy Agent (OPA)

General-purpose policy engine using Rego language. Decouples policy from application logic.

### Architecture
```
┌──────────┐     ┌───────────┐     ┌──────────┐
│ Decision │────►│    OPA    │◄────│  Policy  │
│ Request  │     │  Engine   │     │  (Rego)  │
└──────────┘     └─────┬─────┘     └──────────┘
                       │
                 ┌─────▼─────┐
                 │   Data    │
                 │  (JSON)   │
                 └───────────┘
```

### Use Cases
- Kubernetes admission control (Gatekeeper)
- API authorization (Envoy external authz)
- Terraform plan validation (conftest)
- CI/CD pipeline gates
- Data access policies

### Rego Patterns
```rego
# Deny containers running as root
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.securityContext.runAsNonRoot
    msg := sprintf("Container '%s' must set runAsNonRoot: true", [container.name])
}

# Require resource limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%s' must set memory limits", [container.name])
}
```

## HashiCorp Sentinel

Policy language for HashiCorp products (Terraform Cloud/Enterprise, Vault, Consul).

### Enforcement Levels
- **Advisory**: warn but allow
- **Soft-mandatory**: can be overridden with documented reason
- **Hard-mandatory**: cannot be bypassed

### Common Patterns
```sentinel
# Require encryption on all S3 buckets
import "tfplan/v2" as tfplan

s3_buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket" and
    rc.change.actions contains "create"
}

encryption_check = rule {
    all s3_buckets as _, bucket {
        bucket.change.after.server_side_encryption_configuration is not null
    }
}

main = rule { encryption_check }
```

### Terraform Integration
- Runs between plan and apply
- Access to full plan data (before/after state)
- Mock data for testing policies locally
- Integrates with VCS workflow

## Checkov

Static analysis for IaC (Terraform, CloudFormation, Kubernetes, Helm, Dockerfile).

### Built-in vs Custom
- 2000+ built-in checks mapped to CIS benchmarks
- Custom checks in Python or YAML
- Framework-aware: understands resource relationships

### Custom Check Example (YAML)
```yaml
metadata:
  id: "CUSTOM_001"
  name: "Ensure RDS instances use approved engine versions"
  severity: "HIGH"
definition:
  cond_type: "attribute"
  resource_types:
    - "aws_db_instance"
  attribute: "engine_version"
  operator: "within"
  value:
    - "15.4"
    - "15.5"
    - "16.1"
```

### Pipeline Integration
```yaml
# GitHub Actions
- name: Checkov scan
  uses: bridgecrewio/checkov-action@v2
  with:
    directory: ./terraform
    framework: terraform
    check: CKV_AWS_18,CKV_AWS_19,CKV_AWS_20  # specific checks
    soft_fail: false  # fail the pipeline
```

## Policy Design Principles

1. **Start permissive, tighten over time** -- begin in audit mode
2. **Clear violation messages** -- tell the developer exactly what to fix
3. **Exception mechanism** -- allow documented bypasses with expiration
4. **Test your policies** -- unit tests for Rego/Sentinel just like application code
5. **Version and review** -- policies in git, changes require approval
6. **Map to compliance** -- tag each policy with the control it implements
7. **Measure effectiveness** -- track violations, exceptions, and false positives

## Comparison Matrix

| Feature | OPA/Rego | Sentinel | Checkov |
|---------|----------|----------|---------|
| Scope | General-purpose | HashiCorp stack | IaC files |
| Language | Rego | Sentinel | Python/YAML |
| Runtime enforcement | Yes (admission, authz) | Yes (plan/apply) | No (scan only) |
| Pre-deploy scanning | Yes (conftest) | Yes (TFC/TFE) | Yes (CI) |
| Learning curve | Medium-high | Medium | Low |
| Custom rules | Rego files | Sentinel files | Python/YAML |
| Community rules | Extensive | Limited | Extensive |
| K8s integration | Native (Gatekeeper) | No | Yes (scanning) |
| Cost | Free/OSS | TFC/TFE license | Free/OSS + paid |

## Implementation Roadmap

### Week 1-2: Foundation
- Choose primary tool based on stack (OPA for K8s, Sentinel for Terraform Cloud, Checkov for IaC scanning)
- Define initial policy set from existing written policies
- Set up policy repository with CI

### Week 3-4: Core Policies
- Encryption requirements
- Network exposure rules
- IAM permission boundaries
- Tagging/labeling standards
- Resource sizing constraints

### Week 5-6: Integration
- Pre-commit hooks for local scanning
- CI pipeline gates (advisory mode initially)
- Dashboard for violation visibility
- Exception workflow (request, approve, expire)

### Week 7-8: Enforcement
- Switch critical policies to hard enforcement
- Medium policies to soft enforcement (override with reason)
- Low policies remain advisory
- Establish review cadence (monthly policy updates)

## 2026 Context

- Cedar (AWS) emerging as typed policy language -- better performance than Rego for authz
- AI-assisted policy generation: describe intent in natural language, generate Rego/Sentinel
- Policy-as-code now expected in SOC 2 audits as evidence of control automation
- Supply chain policies: verify SBOM, SLSA level, signer identity before deployment
- Multi-cloud policy frameworks abstract across providers (Crossplane + OPA)
