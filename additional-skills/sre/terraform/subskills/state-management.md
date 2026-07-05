---
type: subskill
title: "Terraform State Management"
---

# Terraform State Management

## Core Concepts
- State maps real-world resources to configuration; it's Terraform's source of truth
- Remote backends (S3, GCS, Terraform Cloud) enable team collaboration and locking
- State locking prevents concurrent modifications that could corrupt state
- State splitting: separate state files per environment, per team, or per blast radius
- Sensitive data in state: state files contain all attribute values including secrets

## Key Practices
- Always use remote backend with locking enabled (DynamoDB for S3, native for GCS/TFC)
- Encrypt state at rest and restrict access via IAM policies
- Split state by lifecycle: networking separate from applications, shared infra separate from team infra
- Use `terraform state mv` for refactoring; `terraform import` for adopting existing resources
- Run `terraform plan` in CI to detect drift; apply only through controlled pipelines

## Common Mistakes
- Storing state locally or in git (no locking, secrets exposed, no team collaboration)
- One monolithic state file for all infrastructure (slow plans, large blast radius)
- Manual `terraform state rm` without understanding downstream references

## When to Apply
- Setting up Terraform for a new project or migrating from local to remote state
- Refactoring large Terraform configurations into smaller, isolated state boundaries
- Resolving state lock conflicts or recovering from state corruption
