---
type: subskill
title: "Pipeline Design"
---

# Pipeline Design

## Core Concepts
- CI/CD pipelines automate build, test, and deployment as a directed acyclic graph of stages
- Pipeline stages: source → build → test → package → deploy → verify
- Fail fast: run cheap checks (lint, unit tests) before expensive ones (integration, e2e)
- Pipeline as code: version-controlled definitions (Jenkinsfile, .github/workflows, .gitlab-ci.yml)
- Idempotency: running the same pipeline on the same commit produces identical artifacts

## Key Practices
- Separate CI (build + test) from CD (deploy) with explicit promotion gates
- Parallelize independent jobs within a stage to reduce wall-clock time
- Cache dependencies (node_modules, .m2, pip cache) across runs with content-hash keys
- Use matrix builds for cross-platform/cross-version testing
- Keep pipeline definitions DRY with reusable templates, composite actions, or shared libraries

## Common Mistakes
- Running the entire test suite on every commit instead of using change-based triggers
- Storing secrets in pipeline files instead of secret management integrations
- Not setting timeouts on jobs, allowing hung pipelines to consume resources indefinitely

## When to Apply
- Setting up CI/CD for a new project or service
- Optimizing slow pipelines (reducing feedback loops)
- Migrating between CI providers (Jenkins → GitHub Actions, etc.)
