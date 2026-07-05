---
type: fact
title: "Terraform Module Design"
---

# Terraform Module Design

## Module Interfaces

A well-designed module exposes a clear contract through variables (inputs) and outputs.

### Input Design Principles

- Use specific types over `any` -- catch errors at plan time
- Provide sensible defaults for optional inputs
- Use `validation` blocks for constraints that aren't expressible in types
- Group related inputs into object variables when they always travel together
- Prefix boolean variables with enabling language: `enable_`, `create_`, `use_`

```hcl
variable "vpc_config" {
  type = object({
    cidr_block           = string
    enable_dns_hostnames = optional(bool, true)
    availability_zones   = list(string)
  })

  validation {
    condition     = can(cidrhost(var.vpc_config.cidr_block, 0))
    error_message = "cidr_block must be a valid CIDR notation."
  }
}
```

### Output Design Principles

- Output everything downstream modules might need
- Use descriptive names that include the resource type: `vpc_id`, `subnet_ids`
- Output both ID and ARN when applicable
- Document outputs with `description`

## Composition Patterns

### Flat Modules

Single-purpose modules that manage one logical resource group. Compose them in root modules:

```hcl
module "vpc" {
  source = "../modules/vpc"
  # ...
}

module "eks" {
  source     = "../modules/eks"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

### Facade Modules

Higher-level modules that compose multiple flat modules into an opinionated stack. Useful for platform teams providing golden paths:

```hcl
module "microservice" {
  source = "../modules/microservice-stack"
  name   = "payment-service"
  # Internally creates: ECS service, ALB target group, IAM role, CloudWatch alarms
}
```

### Data-Only Modules

Modules that only contain data sources and locals -- useful for shared lookups (account ID, region config, naming conventions).

## Testing

### terraform test (1.6+)

Native testing framework. Write `.tftest.hcl` files alongside modules:

```hcl
run "creates_vpc_with_correct_cidr" {
  command = plan

  assert {
    condition     = aws_vpc.main.cidr_block == "10.0.0.0/16"
    error_message = "VPC CIDR does not match expected value."
  }
}

run "full_apply" {
  command = apply

  assert {
    condition     = aws_vpc.main.id != ""
    error_message = "VPC was not created."
  }
}
```

### Terratest (Go)

For complex integration tests that need custom assertions, API calls, or multi-step validation:

- Deploy infrastructure
- Run validation (HTTP checks, DNS resolution, connectivity)
- Tear down infrastructure
- Use `t.Parallel()` for test speed
- Use `terraform.Options` retry logic for eventual consistency

### Contract Tests

Validate module interfaces without full apply. Check that:
- Required outputs exist and are non-empty
- Resource counts match expectations
- Naming conventions are followed

## Versioning

### Semantic Versioning

Tag module releases with semver: `v1.0.0`, `v1.1.0`, `v2.0.0`.

- MAJOR: breaking interface changes (removed variables, renamed outputs)
- MINOR: new features, new optional variables with defaults
- PATCH: bug fixes, documentation

### Source References

Pin module versions in consumers:

```hcl
module "vpc" {
  source  = "git::https://github.com/org/terraform-modules.git//vpc?ref=v2.1.0"
}

module "vpc" {
  source  = "app.terraform.io/org/vpc/aws"
  version = "~> 2.1"
}
```

### Breaking Change Protocol

1. Deprecate in MINOR release (add `moved` blocks, keep old variables with deprecation notice)
2. Remove in next MAJOR release
3. Provide migration guide in CHANGELOG

## Module Structure Standards

```
modules/vpc/
  main.tf          -- resource definitions
  variables.tf     -- all input variables
  outputs.tf       -- all outputs
  versions.tf      -- required_version and required_providers
  locals.tf        -- computed values and naming
  data.tf          -- data source lookups (optional, separate for clarity)
  tests/           -- .tftest.hcl files
  README.md        -- auto-generated with terraform-docs
```

## Anti-Patterns

- God modules that manage unrelated resources
- Hardcoded values that should be variables
- Using `count` for conditional creation when `for_each` with empty map is cleaner
- Nested modules more than 2 levels deep (flattens debugging)
- Outputs that expose implementation details instead of stable interfaces
- Relying on `terraform_remote_state` across team boundaries (use data sources or SSM parameters)
