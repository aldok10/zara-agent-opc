# Security Testing

## SAST (Static Application Security Testing)

Tools and their strengths:

Semgrep:
- Pattern-based, language-aware (supports 30+ languages)
- Custom rules in YAML (easy to write project-specific checks)
- Fast (single-pass, no compilation needed)
- `semgrep --config auto .` for curated community rules
- CI integration: `semgrep ci` (connects to Semgrep Cloud for tracking)

CodeQL:
- GitHub-native, deep data-flow analysis
- Finds complex vulnerabilities (taint tracking across functions)
- Free for open source, included in GitHub Advanced Security
- Custom queries in QL language
- Best for: injection flaws, auth bypasses, deserialization issues

SonarQube:
- Broad language coverage, quality + security in one tool
- Quality gates (block merge if issues introduced)
- Self-hosted or cloud (SonarCloud)
- Tracks technical debt over time
- Best for: organizations wanting unified code quality dashboard

CI integration pattern:
```yaml
- name: Semgrep
  run: semgrep ci --config p/default --config p/owasp-top-ten
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_TOKEN }}
```

## DAST (Dynamic Application Security Testing)

OWASP ZAP:
- Proxy-based scanner (intercepts and modifies requests)
- Active scanning: injects payloads to find vulnerabilities
- Passive scanning: analyzes responses for information leakage
- API scanning with OpenAPI/GraphQL schema import
- Automation framework for CI: `zap-api-scan.py -t openapi.yaml`

Nuclei:
- Template-based vulnerability scanner
- 7000+ community templates (CVEs, misconfigurations, exposures)
- Fast: Go-based, concurrent scanning
- Custom templates for internal applications
- `nuclei -u https://app.example.com -t cves/ -t misconfigurations/`

Authenticated scans:
- Record authentication flow (session tokens, cookies)
- Use authenticated context for scanning protected routes
- ZAP: authentication scripts or session management contexts
- Schedule full scans against staging (not production)

## SCA (Software Composition Analysis)

Dependency scanning:
- `npm audit`, `pip audit`, `cargo audit` for quick checks
- Snyk, Dependabot, Renovate for continuous monitoring
- SBOM generation (CycloneDX, SPDX format)

CVE triage process:
1. Is the vulnerable code path actually reachable in our usage?
2. Is there a public exploit or is it theoretical?
3. What is the CVSS score and attack vector?
4. Can we mitigate without upgrading (WAF rule, input validation)?
5. Priority: exploitable + reachable > high CVSS but unreachable

Auto-fix PRs:
- Dependabot/Renovate create PRs for vulnerable dependencies
- Pin to patch version (not major) to avoid breaking changes
- CI must pass before auto-merge
- Group minor/patch updates, review major updates manually

## Secret Detection

Pre-commit hooks:
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    hooks:
      - id: gitleaks
```

Push protection:
- GitHub push protection blocks pushes containing secrets
- GitLab secret detection in CI pipeline
- Custom patterns for internal secret formats

Tools:
- Gitleaks: regex-based, fast, configurable
- TruffleHog: entropy-based + regex, scans git history
- detect-secrets (Yelp): baseline file approach, fewer false positives

Recovery when secrets leak:
1. Rotate the secret immediately (assume compromised)
2. Force-push to remove from history (BFG Repo-Cleaner or git-filter-repo)
3. Audit access logs for unauthorized use
4. Add pattern to detection rules to prevent recurrence

## Integrating Security into the Testing Pyramid

```
    /  DAST  \           (few, slow, comprehensive)
   / Integration \       (authenticated API security tests)
  /   Unit Tests   \     (input validation, encoding, auth logic)
 / SAST + SCA + Secrets \ (every commit, fast feedback)
```

Layer strategy:
- Every commit: SAST, secret detection, dependency check (seconds)
- Every PR: full SAST suite, SCA with CVE check (minutes)
- Nightly: DAST against staging, full dependency audit (minutes-hours)
- Weekly: penetration testing tools, manual review of findings

## Risk-Based Security Test Allocation

High priority (test heavily):
- Authentication and session management
- Payment and financial transactions
- Data export and API boundaries
- Admin and privilege escalation paths
- File upload and processing

Medium priority:
- User input forms (XSS, injection)
- Third-party integrations
- Email/notification systems
- Search and filtering (injection)

Lower priority (basic coverage):
- Static content pages
- Internal tools with network-level access control
- Read-only public data endpoints

Allocation rule: spend 80% of security testing effort on the 20% of code that handles sensitive operations.
