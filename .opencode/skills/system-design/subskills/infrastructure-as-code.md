# Infrastructure as Code Patterns & Tools

Declarative, versioned, reviewable infrastructure. Git PR is the change interface.

## Tools

- **Terraform**: declarative HCL, state management, huge provider ecosystem (AWS, GCP, Azure, K8s, everything). Industry standard.
- **OpenTofu**: Terraform fork, BSL-free, community-driven, API-compatible. Choose for new projects if license matters.
- **Pulumi**: general-purpose languages (Go, TS, Python), same cloud providers, no HCL to learn. Better for teams who dislike HCL.
- **Crossplane**: K8s-native IaC, CRDs for cloud resources, composition for abstraction. Best for platform teams abstracting infra for developers.
- **CDK (AWS)**: TypeScript/Python compiled to CloudFormation, AWS-specific. Best for all-in-on-AWS shops.

## State Management (Terraform)

- Remote backend: S3 + DynamoDB lock (or equivalent)
- Separate state per environment (blast radius isolation)
- Import existing resources rather than recreate

## Module Design

Composable, versioned, documented, tested. Maintain an internal module registry for reuse.

## Testing IaC

- **Terratest** (Go): spin up real infra, assert, tear down
- `terraform plan` in CI for diff review
- Policy checks: OPA / Sentinel
- Cost estimation: Infracost

## Patterns

- Environment as a module instance
- Hub-spoke networking
- Account vending machine (automated account provisioning)
- Self-service via PR

## Drift Management

Scheduled `plan`, alert on differences, then auto-remediate or open a ticket.

## Anti-Patterns

- One giant monolithic state file
- ClickOps then import (reverse-engineering reality)
- No module versioning
- No CI for IaC
- Shared state without locking (corruption risk)
