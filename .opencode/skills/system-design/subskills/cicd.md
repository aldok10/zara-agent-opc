---
type: subskill
title: "CI/CD Platform Design"
---

# CI/CD Platform Design

CI/CD as a platform capability: developers get pipelines automatically from golden path templates. No pipeline YAML writing required.

## Standard Pipeline Stages

lint -> type-check -> test -> SAST -> build image -> push -> deploy staging -> integration test -> promote prod

## Pipeline Design Principles

- **Fast feedback**: lint + type-check + unit tests in <5 min. Slow tests in parallel/separate stage.
- **Hermetic builds**: same inputs = same outputs. Pin dependencies, pin base images, no network calls during build.
- **Cache aggressively**: dependency cache, build cache, test result cache. Invalidate by lockfile hash.
- **Parallel by default**: split test suites across workers; run independent stages concurrently.

## Tools Landscape (2026)

- **GitHub Actions**: most popular, marketplace, native integration, matrix builds
- **GitLab CI**: self-hosted option, DevSecOps integration, auto-DevOps templates
- **Dagger**: portable pipelines (run anywhere), container-native, programmable (Go/TS/Python SDK)
- **Buildkite**: self-hosted agents, fast, enterprise-scale

## Deployment Strategies

- **Rolling**: simple, zero-downtime
- **Blue/green**: instant rollback, 2x resources
- **Canary**: gradual, requires observability
- **Progressive**: % ramp with auto-rollback on SLO breach

## Security in Pipeline

SAST (semgrep, CodeQL), dependency scanning (Dependabot, Snyk), container scanning (Trivy), secret scanning, SBOM generation.

## Self-Service for Developers

"Click to deploy", auto-rollback on failure, deploy previews per PR, rollback button.

## Metrics

Build time (p50, p95), deployment frequency, pipeline success rate, time-to-rollback.

## Anti-Patterns

- 30+ minute pipelines (nobody waits)
- YAML copy-paste across repos (unmaintainable)
- No caching
- Flaky tests blocking deploy
- Manual approval gates for every deploy
