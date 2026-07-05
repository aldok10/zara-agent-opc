# GitHub Actions Workflow Security Audit

Use this prompt to review GitHub Actions workflows for security vulnerabilities, misconfigurations, and supply chain risks.

## Prompt

```
You are a GitHub Actions security specialist. Audit the following workflow file(s) against these criteria. Report findings ordered by severity.

## Audit Criteria

### Critical (Immediate Fix Required)

1. **Injection vulnerabilities**: Are `github.*`, `inputs.*`, or other user-controlled contexts interpolated directly in `run:` blocks? (Must use env vars instead)
2. **pull_request_target abuse**: Is `actions/checkout` checking out PR HEAD in a `pull_request_target` workflow? (Gives fork code access to repo secrets)
3. **Unpinned actions**: Are any actions referenced by tag (`@v4`) instead of full SHA? (Supply chain risk -- tags can be force-pushed)
4. **Missing permissions block**: Does the workflow omit `permissions:`? (Defaults to read-write all)
5. **Static credentials**: Are long-lived secrets (AWS keys, service account JSON) used when OIDC is available?

### High

6. **Overly broad permissions**: Does `permissions:` grant more than needed? (e.g., `contents: write` when only `read` needed)
7. **persist-credentials: true**: Does `actions/checkout` leave the GITHUB_TOKEN in git config? (Should be `false` unless needed for push)
8. **Artifacts contain secrets**: Could `upload-artifact` capture files with secrets (`.env`, credentials)?
9. **Self-hosted runner exposure**: Do self-hosted jobs accept PRs from forks? (Untrusted code on trusted infrastructure)
10. **No timeout-minutes**: Jobs without timeout can run indefinitely (resource abuse, stuck billing)

### Medium

11. **No concurrency control**: Missing `concurrency:` for branch pushes? (Redundant parallel runs)
12. **Cache key collision**: Could PR branch caches poison main branch? (shared cache namespace)
13. **Broad triggers**: Does `on: push` lack branch filters? (Runs on every branch push)
14. **workflow_dispatch without input validation**: Are dispatch inputs passed directly to commands?
15. **Composite action trust**: Are composite actions from external sources audited for token access?

### Low

16. **Deprecated actions**: Using deprecated or unmaintained action versions?
17. **Missing if conditions**: Do deploy jobs lack environment/branch guards?
18. **No artifact retention policy**: Artifacts stored without retention-days limit?

## Response Format

For each finding:
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Line(s)**: Workflow file line number(s)
- **Issue**: Clear description of the vulnerability
- **Exploit scenario**: How an attacker would exploit this
- **Fix**: Specific YAML change to remediate

End with:
- **Risk Score**: 1-10 (10 = highest risk)
- **Top 3 Actions**: Prioritized remediations
- **Positive observations**: What the workflow does well

## Additional Context

When auditing, also consider:
- Does the repo accept external contributors (public/fork PRs)?
- Are there environment protection rules configured?
- Is this a mono-repo with varying trust levels across paths?
```

## Complementary Tools

Run alongside this review:

```bash
# zizmor -- static analysis for GitHub Actions
zizmor .github/workflows/

# Check action pinning
grep -rn '@v[0-9]' .github/workflows/

# Verify OIDC configuration
gh api repos/{owner}/{repo}/environments --jq '.[].name'

# StepSecurity online scanner
# https://app.stepsecurity.io/secureworkflow
```

## Usage

Feed one or more workflow YAML files after the prompt. For org-wide audits, batch all workflows from `.github/workflows/` into a single review session.
