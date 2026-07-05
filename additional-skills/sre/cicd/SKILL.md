---
name: cicd
description: "Build and delivery pipelines: GitHub Actions, Dagger, SLSA, supply chain security"
---

# CI/CD Specialist

Secure, fast build and delivery pipelines with supply chain integrity guarantees.

## Scope

Covers pipeline authoring (GitHub Actions, Dagger), supply chain security (SLSA, cosign, attestation), caching strategies, test orchestration, and artifact management. Enforces zero-trust CI principles: no static credentials, pinned dependencies, provenance on all artifacts.

## First Action

When loaded: identify the pipeline concern (new workflow, optimization, security hardening, supply chain, CD setup) and read existing `.github/workflows/` or `dagger/` configurations. Check for OIDC setup, pinning practices, and permissions blocks before proposing changes.

## Constraints

1. OIDC identity federation for all cloud access -- zero static credentials stored in CI secrets
2. Pin all GitHub Actions by full commit SHA, not tag -- tags are mutable and can be hijacked
3. SLSA Level 2+ provenance on all release artifacts -- use `actions/attest-build-provenance`
4. Merge queue with required status checks on main -- no direct push, no bypassing CI
5. Cache aggressively: dependency caches (npm, pip, go mod), build outputs, Docker layers -- target >80% hit rate
6. Dagger pipelines for portable CI logic -- same pipeline runs locally and in any CI system
7. Separate CI (test/build) from CD (deploy) -- different trust boundaries, different trigger events
8. Secrets via OIDC/short-lived tokens (15min max) -- never long-lived API keys or service account JSON
9. Fail fast ordering: lint > type-check > unit > integration > e2e (cheapest and fastest first)
10. Artifact attestation: sign all container images and binaries with cosign keyless at build time
11. `permissions:` block required in every workflow -- declare minimal GITHUB_TOKEN scope explicitly
12. Reusable workflows for shared patterns -- DRY across repos, version with tags
13. Self-hosted runners must be ephemeral (fresh VM per job) with network isolation from production
14. Dependency updates via Renovate/Dependabot with auto-merge for patch, review for minor/major

## DO NOT

1. Use `pull_request_target` with `actions/checkout` of PR HEAD (code injection from forks)
2. Allow self-hosted runners without network isolation (lateral movement risk if compromised)
3. Skip `permissions:` block -- defaults to read-write all, violating least privilege
4. Cache secrets, tokens, or credentials in GitHub Actions cache (shared across PRs from forks)
5. Run tests that mutate shared state without isolation (flaky tests, race conditions)
6. Use `actions/checkout@main` or any unpinned action reference (supply chain attack vector)
7. Store long-lived cloud credentials as repository secrets when OIDC is available
8. Build release artifacts on developer machines (non-reproducible, no provenance)
9. Allow workflow_dispatch without input validation (parameter injection risk)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Workflow authoring, optimization | github-actions | Reusable workflows, matrix, caching, OIDC |
| Portable pipeline-as-code | dagger | Dagger modules, SDK, containerized steps |
| Signing, provenance, SBOMs | supply-chain | SLSA, cosign, attestation, Sigstore, SBOM |
| Slow CI, parallelism, costs | pipeline-optimization | Affected filtering, test splitting, caching |

## Verification

- [ ] `gh attestation verify` passes on all release artifacts
- [ ] No workflows with `permissions: write-all` or missing permissions block
- [ ] OIDC configured for cloud access; zero static credentials in repository secrets
- [ ] All actions pinned by SHA (grep for `@v` in workflow files = flag)
- [ ] CI cache hit rate >80% on repeated runs (check cache size and hits in logs)
- [ ] Merge queue enabled on main with required checks
- [ ] Self-hosted runners are ephemeral (no persistent state between jobs)

## Knowledge

- knowledge/github-actions-security.md
- knowledge/dagger-pipelines.md
- knowledge/slsa-provenance.md
- knowledge/ci-caching-strategies.md
- knowledge/supply-chain-hardening.md

## AI-Era Context (2026)

- GitHub Actions Immutable Actions (pinned by digest) is now the recommended default for enterprise
- Dagger 0.13+ supports Dagger Functions and native module sharing via Daggerverse
- SLSA v1.0 specification is finalized; Level 2 achievable with GitHub's built-in attestation actions
- GitHub merge queues handle parallel validation and rebase, replacing manual merge discipline
- `actions/attest-build-provenance` and `actions/attest-sbom` are first-party SLSA generators
- Sigstore Rekor transparency log is GA and stores all keyless signing events permanently
- Arm64 GitHub-hosted runners (Graviton) available -- 40% cheaper for compatible workloads
- AI-generated PRs (Dependabot, Renovate, Copilot) require same CI rigor as human PRs

## Related Skills

- docker -- image builds as CI pipeline steps
- gitops -- CD side triggered by CI artifacts
- supply-chain-security -- SLSA, cosign verification at deploy time
- terraform -- plan/apply pipelines for IaC
