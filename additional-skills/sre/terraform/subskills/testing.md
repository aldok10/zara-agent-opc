---
type: subskill
title: "Terraform Testing"
---

# Terraform Testing

## Core Concepts
- Terraform testing validates that infrastructure code produces correct, secure, compliant results
- Test levels: static analysis (validate, lint), unit (plan assertions), integration (apply + verify), policy
- Plan-based testing: verify planned changes without applying (cost-effective, fast feedback)
- Integration testing: apply to ephemeral environment, verify behavior, destroy
- Policy-as-code: enforce organizational rules before apply (Sentinel, OPA/Rego, Checkov)

## Key Practices
- Run `terraform validate` and `tflint` in CI on every pull request
- Use `terraform test` (native testing framework) for module contract verification
- Write policy checks for security baselines: no public S3 buckets, encryption required, tagging enforced
- Create integration tests using Terratest or native `terraform test` with real providers
- Test module upgrades: verify `terraform plan` shows expected diff when bumping versions

## Common Mistakes
- Only testing in production by applying and hoping (no pre-apply verification)
- Integration tests that don't clean up resources, causing cost leaks
- Overly strict policies that block legitimate use cases without override mechanisms

## When to Apply
- Building shared Terraform modules consumed by multiple teams
- Implementing compliance guardrails for cloud infrastructure
- Adding CI/CD quality gates for infrastructure-as-code changes
