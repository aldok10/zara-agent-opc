# GitHub Actions Security

Hardening GitHub Actions workflows against supply chain attacks, credential theft, and injection vulnerabilities. Applies zero-trust principles: no implicit trust in actions, triggers, or runner environments.

## Key Concepts

### OIDC Identity Federation

Replace long-lived secrets with short-lived tokens via OpenID Connect:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@e3ef0a63e0dea14a0a3e679ee3a7f5b8a5f5f5f5
    with:
      role-to-arn: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1

  - uses: google-github-actions/auth@6fc4af4b145ae7821d527454aa9bd537d1f2dc5f
    with:
      workload_identity_provider: projects/123/locations/global/workloadIdentityPools/github/providers/repo
      service_account: ci@project.iam.gserviceaccount.com
```

OIDC claims include repository, workflow, ref, and actor -- configure trust policies per-repo and per-branch.

### Permissions Block (Required)

Every workflow MUST declare explicit permissions:

```yaml
permissions:
  contents: read
  packages: write
  id-token: write
  attestations: write
```

Without this block, GITHUB_TOKEN defaults to read-write on everything. Explicit scoping limits blast radius of a compromised workflow.

### Action Pinning

Pin all third-party actions by full SHA, never by tag:

```yaml
# GOOD -- immutable reference
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

# BAD -- tag can be force-pushed to point to malicious code
- uses: actions/checkout@v4
```

Renovate/Dependabot can auto-update pinned SHAs with comment annotations.

## Configuration Examples

### Secure Workflow Template

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  checks: write

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
      - uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a
        with:
          node-version-file: .node-version
          cache: npm
      - run: npm ci
      - run: npm test
```

Key points: `persist-credentials: false` prevents token leakage, `timeout-minutes` prevents runaway jobs, `concurrency` avoids redundant runs.

### Environment Protection

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://app.example.com
    runs-on: ubuntu-latest
    steps:
      - run: deploy.sh
```

Environments enforce: required reviewers, wait timers, branch restrictions, and deployment branch policies.

## Common Patterns

### Injection Prevention

```yaml
# VULNERABLE -- attacker controls PR title, injected into shell
- run: echo "PR title is ${{ github.event.pull_request.title }}"

# SAFE -- pass via environment variable (shell handles quoting)
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "PR title is ${PR_TITLE}"
```

All `github.*` and `inputs.*` contexts are user-controlled. Never interpolate them directly into `run:` blocks.

### Reusable Workflows

```yaml
# .github/workflows/reusable-build.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
    secrets:
      NPM_TOKEN:
        required: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - run: npm ci && npm test
```

Caller workflow:
```yaml
jobs:
  ci:
    uses: org/.github/.github/workflows/reusable-build.yml@main
    with:
      node-version: '22'
    secrets: inherit
```

### Fork-Safe PR Workflows

```yaml
on:
  pull_request:  # safe -- runs in context of base repo, limited permissions
    types: [opened, synchronize]

# NEVER use pull_request_target with checkout of PR HEAD:
# on: pull_request_target + actions/checkout ref: ${{ github.event.pull_request.head.sha }}
# This gives untrusted fork code access to base repo secrets
```

## Gotchas

1. `ACTIONS_STEP_DEBUG` set to true by a malicious contributor can expose secrets in logs
2. Composite actions inherit the caller's token -- a compromised composite action gets all caller permissions
3. `github.token` in forks has read-only access, but `pull_request_target` grants write access (dangerous)
4. Cache poisoning: forks can write to the same cache namespace as the base branch on public repos
5. `actions/upload-artifact` artifacts are accessible to anyone with repo read access -- never upload secrets
6. Self-hosted runner `GITHUB_TOKEN` has network access to your infrastructure -- isolate runners

## Quick Reference

| Risk | Mitigation |
|------|-----------|
| Supply chain (malicious action) | Pin by SHA, use Scorecard/StepSecurity |
| Credential theft | OIDC, no static secrets, short-lived tokens |
| Injection | Env vars for user-controlled data, never direct interpolation |
| Privilege escalation | Explicit `permissions:` block, minimal scope |
| Fork attacks | Never `pull_request_target` + checkout HEAD |
| Runner compromise | Ephemeral runners, network isolation |
| Cache poisoning | Separate cache keys per branch, no secrets in cache |

| Tool | Purpose |
|------|---------|
| StepSecurity Harden Runner | Runtime security monitoring for hosted runners |
| Scorecard | Automated security assessment of repositories |
| pin-github-action | CLI to convert tag refs to SHA pins |
| zizmor | Static analysis for GitHub Actions workflows |
