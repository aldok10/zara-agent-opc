---
type: subskill
title: "Artifact Management"
---

# Artifact Management

## Core Concepts
- Build artifacts: compiled binaries, container images, packages, deployment bundles
- Immutable artifacts: once published to a registry, never overwrite—tag with version/SHA
- Provenance: each artifact traces back to source commit, build environment, and dependencies
- Retention policies: balance storage cost against rollback capability
- Promotion model: artifact moves through environments (dev → staging → prod) without rebuild

## Key Practices
- Tag artifacts with git SHA + semantic version; use "latest" only for dev convenience
- Sign artifacts (cosign, GPG) and verify signatures before deployment
- Generate and store SBOMs (Software Bill of Materials) alongside each artifact
- Implement vulnerability scanning in the registry (Trivy, Snyk Container)
- Set retention policies: keep last N releases + any currently deployed + tagged releases

## Common Mistakes
- Rebuilding from source for each environment instead of promoting the same artifact
- Using mutable tags (`:latest`) in production deployments, causing inconsistent rollbacks
- Not cleaning up old artifacts, leading to unbounded storage growth

## When to Apply
- Designing container registry strategy for microservices
- Implementing supply chain security (SLSA compliance)
- Setting up package publishing pipelines (npm, PyPI, Maven)
