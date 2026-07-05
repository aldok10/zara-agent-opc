---
type: tool
title: "Golden Path Template Design Prompt"
---

# Golden Path Template Design Prompt

## Purpose
Design golden path templates that bootstrap new services with production-ready defaults including CI/CD, observability, security, and documentation.

## When to Use
- Creating a new-service scaffolding tool for the platform
- Standardizing how teams create microservices
- Reducing time-to-production for new applications
- Ensuring consistency across services for operational tooling

## Prompt Template

```
You are a platform engineer designing golden path templates for service creation.

CONTEXT:
- Organization size: {team_count}
- Primary languages: {list_languages_used}
- Infrastructure: {kubernetes|ecs|lambda|vms}
- CI/CD: {github_actions|gitlab_ci|jenkins|argocd}
- Service mesh: {istio|linkerd|none}
- Template engine: {cookiecutter|yeoman|backstage|custom_cli}

REQUIREMENTS:
- Service types needed: {api|worker|frontend|data_pipeline}
- Compliance: {SOC2|HIPAA|PCI|internal_only}

DESIGN THE GOLDEN PATH:

1. PROJECT STRUCTURE
   - Source code layout (domain-driven, clean architecture)
   - Configuration management (env-specific, secrets handling)
   - Documentation templates (README, ADRs, runbook)
   - Test structure (unit, integration, e2e directories)

2. CI/CD PIPELINE (included by default)
   - Build and test on every PR
   - Security scanning (SAST, SCA, container scan)
   - Artifact creation (container image, versioned)
   - Deploy to staging automatically
   - Production deploy with approval gate
   - Rollback mechanism

3. OBSERVABILITY (pre-wired)
   - Structured logging (format, correlation IDs)
   - Metrics endpoint (RED metrics auto-instrumented)
   - Distributed tracing (OpenTelemetry setup)
   - Health check endpoints (liveness, readiness, startup)
   - Default dashboard (auto-provisioned in monitoring tool)
   - Default alerts (error rate, latency, saturation)

4. SECURITY DEFAULTS
   - Authentication middleware configured
   - Input validation framework
   - Secrets from vault/secrets manager (not env vars)
   - Network policy (deny-all + explicit allow)
   - Container: non-root, read-only filesystem, no capabilities

5. INFRASTRUCTURE-AS-CODE
   - Terraform/Pulumi module for the service's infra
   - Database provisioning (if needed)
   - DNS and certificate setup
   - Load balancer / ingress configuration
   - Auto-scaling policies

6. DEVELOPER EXPERIENCE
   - Local development setup (docker-compose, Tilt, Skaffold)
   - Makefile / Taskfile with standard commands
   - IDE configuration (.vscode, .idea settings)
   - Pre-commit hooks (lint, format, secrets check)
   - Getting started guide (< 5 min to running locally)

RULES:
- Opinionated defaults, easy escape hatches
- Template must produce a deployable service in < 1 hour
- Every default must be justified (not just "best practice")
- Include what teams WILL need, not everything they MIGHT need
- Version the template — teams should be able to upgrade
- Don't couple template to specific library versions (use ranges wisely)
```

## Output Format

```markdown
## Golden Path Template: {Service Type}

### File Structure
```
service-name/
  src/
  tests/
  infra/
  .github/workflows/
  Dockerfile
  Makefile
  README.md
```

### Included Components
| Component | Tool/Library | Purpose | Customizable |
|-----------|-------------|---------|-------------|

### CI/CD Pipeline Stages
| Stage | Trigger | Actions | Gate |

### Observability Defaults
| Signal | Implementation | Auto-configured |

### Security Posture
| Control | Default Setting | Override Process |

### Usage
```bash
platform create-service --type api --name my-service --team payments
```

### Maintenance
- Template version: {semver}
- Upgrade path: {how teams adopt template updates}
- Breaking changes: {policy}
```
