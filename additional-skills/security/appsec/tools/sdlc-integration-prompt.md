---
type: tool
title: "AppSec SDLC Integration Prompt"
---

# AppSec SDLC Integration Prompt

## Purpose
Design an application security program integrated into the software development lifecycle with appropriate gates, tools, and processes at each phase.

## When to Use
- Building an AppSec program from scratch
- Shifting security left in an existing SDLC
- Choosing and positioning security tools across the pipeline
- Presenting AppSec roadmap to engineering leadership

## Prompt Template

```
You are an AppSec program architect designing SDLC integration.

CONTEXT:
- Org size: {engineering_headcount}
- AppSec team size: {headcount}
- SDLC model: {agile_scrum|kanban|waterfall|SAFe}
- CI/CD: {github_actions|gitlab_ci|jenkins|azure_devops}
- Languages: {primary_languages}
- Current maturity: {none|ad_hoc|some_scanning|mature}
- Compliance drivers: {SOC2|PCI|HIPAA|none}

DESIGN FOR EACH PHASE:

1. REQUIREMENTS/DESIGN
   - Security requirements derivation (from threats, compliance)
   - Threat modeling trigger criteria (new service, auth change, data flow change)
   - Secure design review checklist
   - Tools: threat modeling (STRIDE worksheets, IriusRisk, draw.io DFDs)

2. DEVELOPMENT
   - Secure coding guidelines (language-specific)
   - IDE security plugins (semgrep, snyk, SonarLint)
   - Pre-commit hooks (secrets detection, linting)
   - Developer security training program
   - Security champions network

3. CODE REVIEW
   - Security-focused review checklist
   - When to require AppSec team review vs self-service
   - Automated checks on PR (SAST, dependency scan)
   - Triage criteria for findings (block vs inform)

4. BUILD/CI
   - SAST integration (tool, config, threshold)
   - SCA/dependency scanning (tool, auto-fix PRs)
   - Container image scanning
   - Secrets scanning in CI (not just pre-commit)
   - License compliance checking

5. TEST/QA
   - DAST against staging (tool, scan profile)
   - API security testing (auth, injection, business logic)
   - Security-specific test cases from threat model
   - Penetration testing cadence and scope

6. DEPLOY/RELEASE
   - Security gate criteria (what blocks release)
   - Exception process (risk acceptance for deferred fixes)
   - Runtime protection enablement (WAF, RASP config)
   - Security release notes

7. OPERATE/MONITOR
   - Vulnerability management SLAs (critical: 24h, high: 7d, medium: 30d)
   - Security monitoring and alerting
   - Incident response integration
   - Feedback loop: production findings → requirements

RULES:
- Gates must not create bottlenecks — automate where possible
- Developer experience matters: fast feedback, low false positives
- Start with high-signal tools, add depth over time
- Measure: mean time to remediate, escape rate, finding density trends
```

## Output Format

```markdown
## AppSec SDLC Integration Plan

### Phase Map
| Phase | Activities | Tools | Gate/Check | Owner |
|-------|-----------|-------|-----------|-------|

### Implementation Roadmap
- Phase 1 (month 1-3): {quick wins}
- Phase 2 (month 4-6): {build foundation}
- Phase 3 (month 7-12): {mature and measure}

### Toolchain
| Category | Tool | Integration Point | Blocking? |

### Metrics Dashboard
| Metric | Target | Measurement Method |

### Team Model
- AppSec engineers: {focus areas}
- Security champions: {ratio, responsibilities}
- Developer self-service: {what they handle alone}
```
