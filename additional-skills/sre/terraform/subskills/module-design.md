---
type: subskill
title: "Terraform Module Design"
---

# Terraform Module Design

## Core Concepts
- Modules encapsulate reusable infrastructure patterns with defined inputs and outputs
- Module types: root (deployment entry point), child (reusable component), utility (helper logic)
- Interface design: inputs (variables), outputs (exported values), dependencies (provider requirements)
- Composition over inheritance: combine small, focused modules rather than building mega-modules
- Module versioning enables independent evolution and controlled upgrades

## Key Practices
- Keep modules focused on a single concern (one module = one logical resource group)
- Define clear variable contracts: types, defaults, descriptions, validation rules
- Expose outputs that consumers actually need; avoid exposing all attributes
- Use `for_each` over `count` for resources that need stable addressing on change
- Document module usage with examples in a dedicated `examples/` directory

## Common Mistakes
- Creating modules that are thin wrappers around single resources (no added value)
- Hard-coding values that should be variables, reducing reusability
- Deep module nesting (>3 levels) making debugging and state management difficult

## When to Apply
- Standardizing infrastructure patterns across teams (VPC, EKS cluster, database)
- Reducing copy-paste duplication in Terraform configurations
- Building internal infrastructure platform with self-service modules
