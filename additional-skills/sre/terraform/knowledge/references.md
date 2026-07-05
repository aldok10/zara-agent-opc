# References

## Official Terraform Documentation (8 refs)
- **Terraform Documentation** -- https://developer.hashicorp.com/terraform/docs -- Complete reference for Terraform CLI and language
- **Terraform Language** -- https://developer.hashicorp.com/terraform/language -- HCL syntax, expressions, functions, meta-arguments
- **Terraform CLI** -- https://developer.hashicorp.com/terraform/cli -- Commands reference for plan, apply, state management
- **Terraform Registry** -- https://registry.terraform.io/ -- Providers, modules, and policy libraries
- **Terraform State** -- https://developer.hashicorp.com/terraform/language/state -- Remote backends, locking, import, state manipulation
- **Terraform Functions** -- https://developer.hashicorp.com/terraform/language/functions -- Built-in functions reference
- **Terraform Backend Configuration** -- https://developer.hashicorp.com/terraform/language/backend -- S3, GCS, azurerm, consul backend setup
- **Terraform Upgrade Guides** -- https://developer.hashicorp.com/terraform/language/upgrade-guides -- Breaking changes between major versions

## OpenTofu (4 refs)
- **OpenTofu Documentation** -- https://opentofu.org/docs/ -- Open-source Terraform fork under Linux Foundation
- **OpenTofu State Encryption** -- https://opentofu.org/docs/language/state/encryption/ -- Client-side state encryption
- **OpenTofu Registry** -- https://github.com/opentofu/registry -- Provider and module registry
- **OpenTofu Migration Guide** -- https://opentofu.org/docs/intro/migration/ -- Migrating from Terraform to OpenTofu

## Providers (6 refs)
- **AWS Provider** -- https://registry.terraform.io/providers/hashicorp/aws/latest/docs -- All AWS resource types
- **Google Provider** -- https://registry.terraform.io/providers/hashicorp/google/latest/docs -- All GCP resource types
- **AzureRM Provider** -- https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs -- All Azure resource types
- **Kubernetes Provider** -- https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs -- Kubernetes resources via Terraform
- **Helm Provider** -- https://registry.terraform.io/providers/hashicorp/helm/latest/docs -- Helm chart releases via Terraform
- **Cloudflare Provider** -- https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs -- DNS, workers, tunnels

## Module Development (5 refs)
- **Module Structure** -- https://developer.hashicorp.com/terraform/language/modules/develop -- Standard module layout and conventions
- **Module Composition** -- https://developer.hashicorp.com/terraform/language/modules/develop/composition -- Patterns for composing modules together
- **Module Sources** -- https://developer.hashicorp.com/terraform/language/modules/sources -- Git, registry, local, S3 module sources
- **Published Module Guidelines** -- https://developer.hashicorp.com/terraform/registry/modules/publish -- Requirements for registry publication
- **terraform-aws-modules** -- https://github.com/terraform-aws-modules -- Community-maintained AWS module collection

## Testing & Validation (6 refs)
- **Terraform Test** -- https://developer.hashicorp.com/terraform/language/tests -- Native testing framework with .tftest.hcl files
- **Terraform Validate** -- https://developer.hashicorp.com/terraform/cli/commands/validate -- Configuration syntax and consistency checks
- **Custom Conditions** -- https://developer.hashicorp.com/terraform/language/expressions/custom-conditions -- Preconditions, postconditions, checks
- **Terratest** -- https://terratest.gruntwork.io/ -- Go library for infrastructure integration testing
- **tflint** -- https://github.com/terraform-linters/tflint -- Pluggable Terraform linter
- **Checkov** -- https://www.checkov.io/1.Welcome/Quick%20Start.html -- Static analysis for IaC security and compliance

## Patterns & Best Practices (6 refs)
- **Terraform Best Practices** -- https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices -- Workflow and organization patterns
- **Workspaces** -- https://developer.hashicorp.com/terraform/language/state/workspaces -- Managing multiple environments
- **Data Sources** -- https://developer.hashicorp.com/terraform/language/data-sources -- Reading existing infrastructure
- **Import** -- https://developer.hashicorp.com/terraform/language/import -- Bringing existing resources under management
- **Moved Blocks** -- https://developer.hashicorp.com/terraform/language/modules/develop/refactoring -- Refactoring without destroying resources
- **Stacks** -- https://developer.hashicorp.com/terraform/language/stacks -- Orchestrating multiple configurations (preview)

## State Management & Security (5 refs)
- **Remote State** -- https://developer.hashicorp.com/terraform/language/state/remote -- Shared state backends and data sources
- **Sensitive Variables** -- https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output -- Marking values as sensitive
- **OIDC Authentication** -- https://developer.hashicorp.com/terraform/cloud-docs/workspaces/dynamic-provider-credentials -- Keyless cloud provider auth
- **State Locking** -- https://developer.hashicorp.com/terraform/language/state/locking -- Preventing concurrent state modifications
- **Terraform Cloud** -- https://developer.hashicorp.com/terraform/cloud-docs -- Remote execution, VCS integration, policy as code

## Policy as Code (3 refs)
- **Sentinel** -- https://developer.hashicorp.com/sentinel/docs -- HashiCorp policy-as-code framework
- **OPA for Terraform** -- https://www.openpolicyagent.org/docs/latest/terraform/ -- Open Policy Agent integration
- **Terraform Cloud Run Tasks** -- https://developer.hashicorp.com/terraform/cloud-docs/integrations/run-tasks -- Third-party validation hooks
