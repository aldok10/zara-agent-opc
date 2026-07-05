---
name: terraform
description: "Infrastructure as Code: Terraform/OpenTofu, modules, state, drift detection"
---

# Terraform Specialist

Infrastructure as Code with Terraform 1.9+/OpenTofu 1.8+ for reproducible, auditable infrastructure.

## Scope

Covers HCL authoring, module design, state management, drift detection, testing, policy enforcement, and migration patterns. Applies to both Terraform (HashiCorp BSL) and OpenTofu (MPL-2.0) workflows with Atlantis, Spacelift, or native CI/CD-driven plan/apply cycles.

## First Action

When loaded: identify the IaC concern (new infra, refactoring, state issue, module design, drift, testing) and locate existing Terraform code. Check backend configuration, provider versions, and module sources before proposing changes. Determine if OpenTofu or Terraform is in use.

## Constraints

1. Remote state with locking mandatory -- S3+DynamoDB, GCS+locking, or Terraform Cloud; never local state
2. Plan in PR (automated via Atlantis/Spacelift/CI), apply only after merge to main -- never apply from laptop
3. Modules versioned with semver git tags -- consumers pin with `version = "~> 2.0"` for patch flexibility
4. Separate state files per blast radius -- network, compute, data, platform should be independent stacks
5. `for_each` over `count` -- string keys survive reordering; count indexes shift on removal
6. `moved` blocks for refactoring (rename, restructure) without destroy/recreate -- never use `-state rm`
7. All variables have `type`, `description`, and `validation` blocks -- no untyped or undocumented vars
8. Outputs with `description` for cross-state references via `terraform_remote_state` or data sources
9. Provider versions pinned with `required_providers` block using `~>` constraint (e.g., `~> 5.0`)
10. State files >500 resources must be split -- large state causes slow plans and broad blast radius
11. `import` blocks (TF 1.5+) for adopting existing resources -- never manual `terraform import` in scripts
12. Sensitive variables marked with `sensitive = true`; never output secrets without `sensitive = true`
13. Run `tflint` + `checkov`/`tfsec` in CI before plan -- catch misconfigurations early
14. OpenTofu preferred for new projects when BSL licensing is a concern; API-compatible with Terraform 1.6

## DO NOT

1. Store state locally or commit state files to Git (contains secrets in plaintext, causes conflicts)
2. Use `count` for resources that may be reordered or conditionally removed (index shift destroys resources)
3. Hardcode values that differ per environment -- use variables with environment-specific .tfvars files
4. Apply without reviewing the plan diff (unexpected destroys cause outages)
5. Create monolithic state files with >500 resources (slow plans, broad blast radius on errors)
6. Use `terraform taint` -- deprecated; use `terraform apply -replace=resource.name` instead
7. Reference `terraform_remote_state` across team boundaries (tight coupling); use data sources instead
8. Skip `moved` blocks during refactoring (causes unnecessary destroy/recreate cycles)
9. Use `ref=main` for module sources -- mutable references break reproducibility

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Creating reusable modules | module-design | Interface, composition, versioning, docs |
| State migration, locking issues | state-management | Backend config, split, import, moved, DR |
| Validating IaC correctness | testing | terraform test, Terratest, plan assertions |
| Out-of-band changes detected | drift-detection | Scheduled plans, alerting, reconciliation |
| Compliance and guardrails | policy | Sentinel, OPA/Rego, checkov, tfsec |

## Verification

- [ ] `terraform plan` shows no unexpected changes on main branch
- [ ] State backend has encryption at rest and locking enabled
- [ ] `tflint` passes with zero warnings
- [ ] `checkov -d .` passes with no failed checks (or documented skip with reason)
- [ ] All module sources use pinned versions (semver tag or commit SHA)
- [ ] Variables have type constraints and validation rules
- [ ] No secrets in outputs or state visible via `terraform show`

## Knowledge

- knowledge/terraform-module-patterns.md
- knowledge/terraform-state-management.md
- knowledge/terraform-testing.md
- knowledge/terraform-drift-detection.md
- knowledge/opentofu-migration.md

## AI-Era Context (2026)

- Terraform 1.9+ includes `terraform test` with mocking and plan assertions -- Terratest less necessary for unit tests
- OpenTofu 1.8 added client-side state encryption -- state at rest encrypted without relying on backend encryption
- `import` blocks and `moved` blocks are the standard refactoring workflow; CLI state manipulation is deprecated
- Spacelift and env0 replaced Atlantis for many teams -- native drift detection, policy, and cost estimation
- Provider-defined functions (TF 1.8+) allow provider-specific logic in expressions
- Stacks (Terraform Stacks / OpenTofu) are emerging for orchestrating multiple state files with dependencies
- `checkov` 3.x supports custom Python policies and auto-fix for common misconfigurations
- HCP Terraform (formerly Terraform Cloud) added ephemeral workspaces for testing modules
- Terragrunt 0.70+ for DRY multi-environment orchestration when native workspaces insufficient

## Related Skills

- aws -- primary cloud provider target for Terraform modules
- gitops -- PR-based apply workflow with Atlantis/Spacelift
- cicd -- pipeline integration for plan/apply cycles
- cost-optimization -- infracost integration for cost-aware IaC
