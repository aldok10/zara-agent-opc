# References

## GitHub Actions (8 refs)
- **GitHub Actions Documentation** -- https://docs.github.com/en/actions -- Complete reference for workflows, jobs, and runners
- **Workflow Syntax** -- https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions -- YAML specification for workflow files
- **GitHub Actions Marketplace** -- https://github.com/marketplace?type=actions -- Official and community actions
- **Reusable Workflows** -- https://docs.github.com/en/actions/using-workflows/reusing-workflows -- Sharing workflows across repositories
- **Self-hosted Runners** -- https://docs.github.com/en/actions/hosting-your-own-runners -- Custom runner infrastructure
- **GitHub Actions Security** -- https://docs.github.com/en/actions/security-guides -- Secret management, OIDC, permissions
- **Composite Actions** -- https://docs.github.com/en/actions/creating-actions/creating-a-composite-action -- Bundling steps into reusable actions
- **Environments** -- https://docs.github.com/en/actions/deployment/targeting-different-environments -- Protection rules and deployment approvals

## Dagger (5 refs)
- **Dagger Documentation** -- https://docs.dagger.io/ -- Programmable CI/CD engine with containers
- **Dagger Go SDK** -- https://docs.dagger.io/sdk/go -- Writing pipelines in Go
- **Dagger TypeScript SDK** -- https://docs.dagger.io/sdk/typescript -- Writing pipelines in TypeScript
- **Dagger Functions** -- https://docs.dagger.io/features/functions -- Composable pipeline building blocks
- **Dagger Modules** -- https://docs.dagger.io/features/modules -- Reusable pipeline components on Daggerverse

## SLSA & Supply Chain Security (7 refs)
- **SLSA Framework** -- https://slsa.dev/ -- Supply-chain Levels for Software Artifacts specification
- **SLSA Requirements** -- https://slsa.dev/spec/v1.0/requirements -- Build levels and verification requirements
- **Sigstore** -- https://docs.sigstore.dev/ -- Keyless signing, verification, and transparency logs
- **in-toto** -- https://in-toto.io/ -- Supply chain integrity framework for build steps
- **SBOM (SPDX)** -- https://spdx.github.io/spdx-spec/v2.3/ -- Software Bill of Materials standard
- **CycloneDX** -- https://cyclonedx.org/docs/ -- OWASP SBOM standard for vulnerabilities
- **GitHub Artifact Attestations** -- https://docs.github.com/en/actions/security-guides/using-artifact-attestations -- Build provenance for artifacts

## Container CI (5 refs)
- **Docker Build in CI** -- https://docs.docker.com/build/ci/ -- Optimizing container builds in pipelines
- **GitHub Container Registry** -- https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry -- Publishing OCI images
- **Kaniko** -- https://github.com/GoogleContainerTools/kaniko -- Building containers without Docker daemon
- **ko** -- https://ko.build/ -- Fast Go container image builder
- **crane** -- https://github.com/google/go-containerregistry/tree/main/cmd/crane -- Container registry interaction tool

## GitOps Deployment (4 refs)
- **ArgoCD GitHub Actions** -- https://github.com/argoproj/argo-cd/tree/master/examples -- Triggering GitOps deployments from CI
- **Flux Image Automation** -- https://fluxcd.io/flux/guides/image-update/ -- Automatic image tag updates
- **GitHub Actions for Kubernetes** -- https://docs.github.com/en/actions/deployment/deploying-to-your-cloud-provider/deploying-to-kubernetes -- Cloud-provider deployment patterns
- **GitHub Actions OIDC** -- https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect -- Keyless cloud authentication from CI

## Testing in CI (5 refs)
- **act** -- https://github.com/nektos/act -- Run GitHub Actions locally for testing
- **actionlint** -- https://github.com/rhysd/actionlint -- Static checker for GitHub Actions workflow files
- **Testcontainers** -- https://testcontainers.com/ -- Disposable containers for integration testing
- **GitHub Actions Caching** -- https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows -- Dependency and build cache strategies
- **Playwright in CI** -- https://playwright.dev/docs/ci -- Browser testing in CI environments

## Other CI Systems (5 refs)
- **GitLab CI/CD** -- https://docs.gitlab.com/ee/ci/ -- Pipeline configuration and runners
- **CircleCI** -- https://circleci.com/docs/ -- Cloud CI with orbs and Docker layers
- **Buildkite** -- https://buildkite.com/docs -- Hybrid CI with self-hosted agents
- **Tekton** -- https://tekton.dev/docs/ -- Kubernetes-native CI/CD pipelines
- **Jenkins X** -- https://jenkins-x.io/v3/ -- Cloud-native Jenkins for Kubernetes

## Pipeline Patterns (4 refs)
- **Trunk-based Development** -- https://trunkbaseddevelopment.com/ -- Branching strategy for continuous integration
- **Release Please** -- https://github.com/googleapis/release-please -- Automated release management
- **Semantic Versioning** -- https://semver.org/ -- Version numbering specification
- **Conventional Commits** -- https://www.conventionalcommits.org/ -- Structured commit message standard
