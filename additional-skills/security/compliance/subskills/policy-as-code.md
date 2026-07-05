# Policy as Code

Automated policy enforcement using OPA, Sentinel, Checkov, and other tools for compliance-at-deploy.

## When to Load

- Implementing automated compliance gates in CI/CD
- Writing OPA/Rego policies for infrastructure decisions
- Setting up Terraform policy enforcement with Sentinel or Checkov
- Shifting compliance left into the development workflow

## Key Concepts

**Policy as Code Principles**
- Policies are versioned, reviewed, tested -- same as application code
- Enforcement at deploy time, not after-the-fact scanning
- Fail closed: unknown resources are denied until policy is updated
- Policy exceptions are explicit, tracked, and time-bounded
- Separation: policy logic from policy data (parameters, lists)

**Tool Landscape**
- OPA/Rego: general-purpose policy engine (Kubernetes, APIs, data)
- Sentinel: HashiCorp-native (Terraform Cloud/Enterprise)
- Checkov: static analysis for IaC (Terraform, CloudFormation, K8s)
- Kyverno: Kubernetes-native policy engine (YAML-based, no Rego)
- AWS Config Rules: cloud-native configuration compliance
- Azure Policy: built-in + custom policy definitions

**Enforcement Points**
- Pre-commit: lint IaC locally before push
- CI pipeline: block merge if policy violations detected
- Admission controller: block non-compliant K8s resources at apply time
- Terraform plan: evaluate plan output against policies before apply
- Runtime: continuous monitoring for drift from policy

## Patterns

```rego
# OPA: deny pods without resource limits
package kubernetes.admission

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%s' must have memory limits", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container '%s' must have CPU limits", [container.name])
}
```

```python
# Checkov custom check
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories

class S3BucketVersioning(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket has versioning enabled"
        id = "CKV_CUSTOM_1"
        supported_resources = ["aws_s3_bucket_versioning"]
        categories = [CheckCategories.BACKUP_AND_RECOVERY]
        super().__init__(name=name, id=id,
                         categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        versioning = conf.get("versioning_configuration", [{}])
        if isinstance(versioning, list):
            versioning = versioning[0]
        status = versioning.get("status", ["Disabled"])
        if isinstance(status, list):
            status = status[0]
        return CheckResult.PASSED if status == "Enabled" else CheckResult.FAILED
```

**Policy Testing**
- Unit test policies with known-good and known-bad inputs
- Regression tests: ensure policy changes don't break existing compliant resources
- Dry-run mode: evaluate but don't block (for rollout)
- Policy coverage metrics: what percentage of resources have policy coverage

## Gotchas

- Rego learning curve is steep; provide team training and starter templates
- Over-restrictive policies cause developer friction and workarounds
- Policy exceptions without expiry become permanent loopholes
- Different enforcement points may have different policy evaluation timing
- Checkov/tfsec may flag false positives on dynamic values (use skip annotations sparingly)

## Verification

- Deploy known-violating resource; confirm pipeline blocks it
- Deploy compliant resource; confirm it passes without manual intervention
- Test policy exception flow: request, approve, apply, verify expiry
- Run policy test suite (conftest, OPA test) -- all pass
- Confirm no unenforced critical policies (coverage report)
