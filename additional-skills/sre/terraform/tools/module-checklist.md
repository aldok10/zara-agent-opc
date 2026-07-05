---
type: tool
title: "Terraform Module Publishing Checklist"
---

# Terraform Module Publishing Checklist

Before publishing or releasing a new version of a Terraform module, verify all items.

## Interface

- [ ] All variables have `description` and appropriate `type`
- [ ] Required variables have no `default`; optional variables have sensible defaults
- [ ] `validation` blocks added for constraints not expressible in types
- [ ] All outputs have `description`
- [ ] Output names are descriptive (include resource type: `vpc_id` not `id`)
- [ ] Breaking changes documented in CHANGELOG with migration path

## Code Quality

- [ ] `terraform fmt` passes cleanly
- [ ] `terraform validate` passes
- [ ] `tflint` reports no errors or warnings
- [ ] No hardcoded values (regions, account IDs, AMI IDs)
- [ ] No sensitive values in defaults or locals
- [ ] Provider version constraints set in `versions.tf`
- [ ] `required_version` set to minimum supported Terraform version

## Testing

- [ ] Plan-only tests pass (`terraform test` with `command = plan`)
- [ ] Integration tests pass (apply + destroy) in isolated environment
- [ ] Tests cover the primary use case and at least one edge case
- [ ] Destroy is clean (no orphaned resources)

## Documentation

- [ ] README generated/updated with `terraform-docs`
- [ ] Usage example in README is copy-paste-runnable
- [ ] CHANGELOG updated with version, date, and change summary
- [ ] Breaking changes called out explicitly

## Security

- [ ] No overly permissive IAM policies (`*` action or resource)
- [ ] Encryption enabled by default on storage resources
- [ ] Public access blocked by default
- [ ] Security groups follow least-privilege (no 0.0.0.0/0 ingress without justification)
- [ ] Secrets referenced via data sources (SSM, Secrets Manager), never as variables

## Versioning

- [ ] Git tag follows semver: `vMAJOR.MINOR.PATCH`
- [ ] Tag matches CHANGELOG entry
- [ ] `moved` blocks added for any renames (kept for at least one release cycle)
- [ ] Previous version still works (backward compatibility for MINOR/PATCH)

## Operational

- [ ] Module tested with both minimum and latest supported provider versions
- [ ] State migration tested if resource structure changed
- [ ] Destroy behavior documented for stateful resources (databases, buckets)
- [ ] Outputs sufficient for downstream consumers (no need to read state directly)
