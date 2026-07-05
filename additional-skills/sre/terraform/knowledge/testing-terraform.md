---
type: fact
title: "Testing Terraform"
---

# Testing Terraform

## terraform test (Native, 1.6+)

The built-in test framework runs `.tftest.hcl` files without external tools.

### Structure

```
modules/vpc/
  main.tf
  variables.tf
  tests/
    basic.tftest.hcl
    validation.tftest.hcl
```

### Plan-Only Tests (Fast, No Resources)

```hcl
variables {
  cidr_block         = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

run "validates_subnet_count" {
  command = plan

  assert {
    condition     = length(aws_subnet.private) == 2
    error_message = "Expected 2 private subnets."
  }
}

run "validates_naming" {
  command = plan

  assert {
    condition     = aws_vpc.main.tags["Name"] == "test-vpc"
    error_message = "VPC name tag incorrect."
  }
}
```

### Apply Tests (Full Integration)

```hcl
run "creates_and_validates" {
  command = apply

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC not created."
  }

  assert {
    condition     = aws_vpc.main.enable_dns_hostnames == true
    error_message = "DNS hostnames not enabled."
  }
}
```

### Mock Providers (1.7+)

Override provider behavior for unit testing without cloud access:

```hcl
mock_provider "aws" {
  mock_resource "aws_vpc" {
    defaults = {
      id = "vpc-mock123"
    }
  }
}
```

### Running Tests

```bash
terraform test                    # run all tests
terraform test -filter=basic      # run specific test file
terraform test -verbose           # detailed output
```

## Terratest (Go-Based Integration)

For complex scenarios requiring custom logic, multi-step validation, or cross-service assertions.

### Basic Pattern

```go
func TestVpcModule(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/vpc",
        Vars: map[string]interface{}{
            "cidr_block":         "10.0.0.0/16",
            "availability_zones": []string{"us-east-1a", "us-east-1b"},
        },
        NoColor: true,
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    vpcId := terraform.Output(t, opts, "vpc_id")
    assert.NotEmpty(t, vpcId)

    vpc := aws.GetVpcById(t, vpcId, "us-east-1")
    assert.Equal(t, "10.0.0.0/16", vpc.CidrBlock)
}
```

### Best Practices

- Always `defer terraform.Destroy` before `Apply` -- ensures cleanup on test failure
- Use `t.Parallel()` for independent tests
- Use retries for eventually-consistent resources: `terraform.ApplyWithRetry`
- Tag test resources for cost tracking and cleanup: `"Environment": "test"`
- Run integration tests in isolated accounts or projects
- Set timeouts appropriate to resource creation time

### Cleanup Automation

Use `cloud-nuke` or `aws-nuke` as a safety net for leaked test resources. Schedule daily cleanup of resources tagged with test markers older than 4 hours.

## Contract Tests

Validate module interfaces and conventions without deploying. Run in CI on every PR.

### What to Validate

- All required variables have descriptions
- All outputs have descriptions
- Naming conventions followed (resource names match `${var.project}-${var.environment}-*`)
- Required tags present on all taggable resources
- No hardcoded regions, account IDs, or AMI IDs
- Provider versions pinned with constraints

### Tools

- `tflint` -- linting rules, naming conventions, deprecated syntax
- `terraform validate` -- syntax and internal consistency
- `terraform-docs` -- verify README stays in sync with interface
- `conftest` (OPA) -- policy-as-code for plan output

### conftest Example

```rego
package terraform

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    not resource.change.after.server_side_encryption_configuration
    msg := sprintf("S3 bucket %s must have encryption enabled", [resource.address])
}
```

### CI Pipeline

```yaml
steps:
  - terraform fmt -check
  - terraform validate
  - tflint --recursive
  - terraform test (plan-only tests)
  - conftest test tfplan.json
  # Integration tests run on merge to main, not every PR
```

## Test Strategy by Module Maturity

| Phase | Tests | Speed |
|-------|-------|-------|
| Development | validate + fmt + plan-only | seconds |
| PR Review | + tflint + conftest + contract | < 2min |
| Merge | + terraform test (apply) | 5-15min |
| Release | + Terratest full suite | 15-45min |
