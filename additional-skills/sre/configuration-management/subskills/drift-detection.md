---
type: subskill
title: "Drift Detection"
---

# Drift Detection

Desired state enforcement, remediation strategies, and configuration drift reporting.

## When to Load
- Detecting infrastructure drift from declared state
- Implementing automatic remediation
- Setting up drift reporting and alerting
- Choosing between reconciliation approaches

## Key Concepts

**Configuration drift:** actual state diverges from declared/desired state. Causes: manual changes, failed automation, partial updates, external modifications.

**Detection approaches:**
- Periodic plan/diff: run `terraform plan`, `kubectl diff` on schedule
- Continuous reconciliation: GitOps controllers (Flux, ArgoCD) that constantly sync
- Event-driven: react to change events (CloudTrail, K8s audit logs)
- Agent-based: tools running on hosts that report divergence

**Remediation strategies:**
- Alert only: notify humans to investigate
- Auto-remediate: reapply desired state (risky for stateful resources)
- Quarantine: flag resource, prevent further changes until reviewed

## Patterns

**Terraform drift detection (CI pipeline):**
```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection
on:
  schedule:
    - cron: "0 */6 * * *"

jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        id: plan
        run: |
          terraform init -backend-config=prod.hcl
          terraform plan -detailed-exitcode -out=plan.out 2>&1 | tee plan.txt
        continue-on-error: true

      - name: Notify on drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          curl -X POST "$SLACK_WEBHOOK" -d '{
            "text": "Drift detected in production infrastructure. Review required.",
            "attachments": [{"text": "'"$(head -50 plan.txt)"'"}]
          }'
```

**ArgoCD drift detection and sync:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production
spec:
  source:
    repoURL: https://github.com/org/k8s-config
    path: clusters/prod
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        maxDuration: 3m
```

**AWS Config for cloud drift:**
```hcl
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"
  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }
  input_parameters = jsonencode({
    tag1Key   = "team"
    tag2Key   = "environment"
    tag3Key   = "cost-center"
  })
}

resource "aws_config_remediation_configuration" "auto_tag" {
  config_rule_name = aws_config_config_rule.required_tags.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-SetRequiredTags"
  automatic        = true
  maximum_automatic_attempts = 3
  retry_attempt_seconds      = 60
}
```

## Gotchas
- Terraform state drift detection requires `refresh` -- which can be slow and rate-limited
- Auto-remediation on stateful resources (databases, storage) can cause data loss
- ArgoCD `selfHeal: true` with `prune: true` will delete manually-created resources
- Drift caused by auto-scaling (desired count changes) creates false positives
- Cloud provider eventual consistency: changes may appear as drift temporarily
- Large Terraform states: split into smaller workspaces to reduce blast radius

## Verification
- `terraform plan -detailed-exitcode` (exit 0 = no drift, exit 2 = drift detected)
- `argocd app diff <app>` for ArgoCD-managed resources
- `kubectl diff -f <manifest>` for Kubernetes resource comparison
- AWS Config compliance dashboard for cloud resource drift
- Drift resolution time metric (time from detection to fix)
- False positive rate (tune detection to reduce noise)
