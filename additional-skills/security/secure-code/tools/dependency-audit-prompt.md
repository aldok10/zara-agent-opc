---
type: tool
title: "Dependency Security Audit Prompt"
---

# Dependency Security Audit Prompt

## Purpose
Audit third-party dependencies for known vulnerabilities, assess upgrade paths, and prioritize remediation based on exploitability and exposure.

## When to Use
- Triaging dependency vulnerability scan results (Snyk, Dependabot, npm audit)
- Assessing risk of a newly disclosed CVE affecting your stack
- Planning major dependency upgrade sprints
- Evaluating security posture of a new dependency before adoption

## Prompt Template

```
You are a supply chain security analyst auditing project dependencies.

CONTEXT:
- Package manager: {npm|pip|maven|go_mod|cargo|composer}
- Project type: {web_app|api|library|cli_tool}
- Environment: {production|internal|development_only}
- Vulnerability source: {snyk|dependabot|npm_audit|trivy|grype}
- Current findings: {count_by_severity}

DEPENDENCY LIST / LOCKFILE:
{paste_package_lock_or_vulnerability_report}

FOR EACH VULNERABLE DEPENDENCY:

1. VULNERABILITY ASSESSMENT
   - CVE ID and description
   - CVSS score (base + environmental adjustment)
   - Is it exploitable in YOUR context? (not just theoretically)
   - Is the vulnerable code path actually reachable?
   - Is it a direct dependency or transitive?
   - Is it a runtime dependency or dev/build only?

2. IMPACT ANALYSIS
   - What could an attacker achieve? (RCE, data leak, DoS, XSS)
   - Is the application exposed to untrusted input reaching this dep?
   - Are there mitigating controls already in place? (WAF, sandboxing, input validation)
   - Blast radius if exploited

3. UPGRADE PATH
   - Fixed version available?
   - Breaking changes between current and fixed version
   - Intermediate versions to step through (if major jump)
   - Is there a patch-only fix (no feature changes)?
   - Alternative packages if dependency is abandoned

4. REMEDIATION PRIORITY
   - Critical (24h): exploitable RCE in production runtime dep
   - High (7 days): exploitable with moderate effort, or data exposure
   - Medium (30 days): requires specific conditions, limited impact
   - Low (next sprint): dev dependency, informational, theoretical only
   - Accept risk: document justification, set review date

5. SUPPLY CHAIN HEALTH CHECK
   - Maintainer activity (last commit, last release)
   - Known maintainer compromises (event-stream style attacks)
   - Typosquatting risk assessment
   - License compatibility

RULES:
- Don't panic-upgrade: assess actual risk before jumping versions
- Transitive deps need different handling (update direct dep that pulls it in)
- Dev-only dependencies are lower priority but not zero risk (build compromise)
- Pin exact versions after upgrade, don't use open ranges
- Test after upgrade: dependency updates are code changes
```

## Output Format

```markdown
## Dependency Security Audit

### Summary
- Total vulnerabilities: {count}
- Actionable (exploitable in context): {count}
- Accepted risk: {count}
- Upgrade required: {count}

### Priority Remediation
| Dep | Current | Fixed | CVE | Severity | Context Risk | Action |
|-----|---------|-------|-----|----------|-------------|--------|

### Upgrade Plan (Order)
1. [Dep A]: reason for priority
2. [Dep B]: reason for priority

### Accepted Risks
| Dep | CVE | Justification | Review Date |

### Supply Chain Concerns
- [Dependencies with maintenance issues]
- [Unusual packages worth investigating]
```
