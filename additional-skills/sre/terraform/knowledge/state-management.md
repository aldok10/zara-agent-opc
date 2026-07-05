---
type: fact
title: "Terraform State Management"
---

# Terraform State Management

## Backends

State backends determine where Terraform persists its state file. Production workloads require remote backends with locking.

### S3 + DynamoDB (AWS)

The standard AWS backend uses S3 for storage and DynamoDB for state locking. Enable versioning and encryption on the bucket. Use a dedicated AWS account for state storage when possible.

Key configuration:
- `encrypt = true` -- server-side encryption at rest
- `dynamodb_table` -- provides distributed locking to prevent concurrent writes
- `key` -- path within the bucket, determines state file granularity

### GCS (GCP)

GCS provides built-in object locking without a separate table. Use `prefix` to namespace state files per environment.

### Azure Blob

Use `azurerm` backend with blob lease-based locking. Container-level RBAC limits blast radius.

### Terraform Cloud / HCP

Managed backend with built-in locking, run history, and policy enforcement. Best when team wants zero backend infrastructure management.

## State Locking

Locking prevents two operators or CI jobs from writing state simultaneously. Without locking, state corruption is inevitable in team environments.

Rules:
- Never disable locking in production (`-lock=false` is for emergency recovery only)
- Set `lock_timeout` to a reasonable value (e.g., 5m) in CI to handle transient lock contention
- If a lock is stuck, use `terraform force-unlock <LOCK_ID>` after confirming no active operation

## State Split Strategies

Monolithic state files create coupling, slow plans, and broad blast radius. Split state by:

### By Environment

Separate state per environment (dev/staging/prod). Use workspaces or directory structure. Directory structure is more explicit and auditable.

```
environments/
  dev/
    main.tf
    backend.tf
  staging/
    main.tf
    backend.tf
  prod/
    main.tf
    backend.tf
```

### By Domain / Service

Split along service boundaries. Networking, compute, data, and DNS each get their own state. Cross-reference with `terraform_remote_state` data sources or output lookups.

### By Blast Radius

High-risk resources (IAM, networking) in separate state from frequently-changing resources (app configs, scaling policies). This limits damage from a bad apply.

### By Lifecycle

Resources with different change frequencies belong in different states. VPC changes yearly; ASG config changes weekly.

## terraform import and moved Blocks

### import (Terraform 1.5+)

Declarative import brings existing infrastructure under management without `terraform import` CLI:

```hcl
import {
  to = aws_s3_bucket.logs
  id = "my-existing-bucket-name"
}
```

Run `terraform plan` to generate the resource config, then remove the import block after successful apply.

### moved Blocks

Refactor state without destroy/recreate cycles:

```hcl
moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}
```

Use cases:
- Renaming resources
- Moving resources into/out of modules
- Splitting modules apart

After successful apply, remove the moved block. Keep moved blocks in version control long enough for all environments to apply.

## Operational Practices

- Enable state file versioning -- allows rollback after corruption
- Restrict state access via IAM policies (least privilege)
- Never store state in version control (contains secrets in plaintext)
- Use `terraform state list` and `terraform state show` for debugging
- Backup state before risky operations: `terraform state pull > backup.tfstate`
- Audit state access logs (S3 access logs, CloudTrail)

## State Refresh

`terraform refresh` (or the implicit refresh during plan) syncs state with real infrastructure. In Terraform 1.7+, prefer `terraform plan -refresh-only` for explicit refresh operations -- it shows what would change before writing.

## Migration Between Backends

Use `terraform init -migrate-state` to move state between backends. Always:
1. Backup current state
2. Configure new backend in code
3. Run `terraform init -migrate-state`
4. Verify with `terraform state list`
5. Remove old backend resources only after confirming migration
