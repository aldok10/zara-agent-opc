---
type: subskill
title: "Audit & Compliance"
---

# Audit & Compliance

Audit logging, policy enforcement, and CIS benchmark compliance.

## When to Load
- Setting up cloud audit logging
- Implementing policy-as-code for compliance
- Running CIS benchmark audits
- Preparing for SOC2/ISO27001/PCI-DSS requirements

## Key Concepts

**Audit log types:**
- Cloud provider: API calls (CloudTrail, Cloud Audit Logs, Azure Activity Log)
- Kubernetes: API server audit logs (who did what to which resource)
- Application: business logic events (user actions, data access)
- OS: system events (auth, process, file access)

**Policy-as-code:** define compliance requirements as code, enforce automatically. Tools: OPA/Gatekeeper, Kyverno, AWS Config Rules, Azure Policy.

**CIS Benchmarks:** consensus-based security configuration standards. Available for: Kubernetes, AWS, Azure, GCP, Linux, Docker. Levels: L1 (essential, minimal impact) and L2 (defense in depth, may impact functionality).

## Patterns

**Kubernetes audit policy:**
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
    resources: [{ group: "", resources: ["endpoints", "services"] }]

  - level: Metadata
    resources: [{ group: "", resources: ["secrets", "configmaps"] }]

  - level: RequestResponse
    users: ["system:anonymous"]
    
  - level: Request
    resources:
      - { group: "", resources: ["pods", "services"] }
      - { group: "apps", resources: ["deployments", "statefulsets"] }
    verbs: ["create", "update", "patch", "delete"]

  - level: Metadata
    omitStages: ["RequestReceived"]
```

**OPA Gatekeeper constraint (require resource limits):**
```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredResources
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredresources
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container %v must have memory limits", [container.name])
        }
```

**AWS Config rule (encrypted volumes):**
```hcl
resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
  scope {
    compliance_resource_types = ["AWS::EC2::Volume"]
  }
}

resource "aws_config_remediation_configuration" "encrypt" {
  config_rule_name = aws_config_config_rule.encrypted_volumes.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-EnableEbsEncryptionByDefault"
  automatic        = true
}
```

## Gotchas
- Audit logs at RequestResponse level for all resources generates massive volume and cost
- CloudTrail data events (S3 object-level, Lambda invocations) are expensive -- enable selectively
- Policy enforcement in "audit" mode first, then "enforce" -- avoid breaking production
- CIS benchmarks are a baseline, not a complete security program
- Kubernetes audit logs require external shipping (they're not stored by managed services by default)
- Compliance evidence collection is ongoing, not point-in-time -- automate evidence gathering

## Verification
- `kubectl get constrainttemplates` and `kubectl get constraints` for OPA policy status
- `aws configservice get-compliance-details-by-config-rule` for AWS Config results
- kube-bench for CIS Kubernetes benchmark automated scanning
- `aws cloudtrail lookup-events` for CloudTrail query
- Compliance dashboard: % of resources compliant per control
- Alert on policy violations (not just report)
