---
type: subskill
title: "Golden Path Templates & Service Blueprints"
---

# Golden Path Templates & Service Blueprints

Opinionated, pre-approved, production-ready service templates. "The fastest way to production with all best practices built in."

## What's Included

Project structure, CI/CD pipeline, Dockerfile, K8s manifests, observability (OTel), security defaults, linting, testing framework, docs template, health endpoints.

## Key Philosophy

Golden PATH, not golden CAGE. Make the right thing easy; don't make the wrong thing impossible. **An escape hatch always exists.** Developers who feel trapped will circumvent the platform.

## Template Design Principles

- **Opinionated defaults**: 90% of teams should never need to change these
- **Zero-config observability**: traces, metrics, logs wired from day 1
- **Security baked in**: SAST in CI, dependency scanning, minimal container images
- **Documentation wired**: ADR template, README template, auto-generated API docs

## Types of Golden Paths

REST API service, event consumer, scheduled job, frontend app, data pipeline, ML model serving. Each is a distinct template.

## Scaffolding Tools

- **Backstage software templates**: integrated with portal, best if using Backstage
- **Cookiecutter**: language-agnostic, Python-based, widely known
- **Yeoman**: JS ecosystem
- **Custom CLI**: often the best UX (`platform new service --type=api`)

## Maintenance

Templates need updates: dependency bumps, new best practices, security patches. **Treat like a product with releases and a changelog.** Unmaintained templates become security debt.

## Adoption Metrics

- % of new services using the golden path
- Time-to-first-deploy: golden path vs custom

## Migration

Existing services adopt gradually: add CI pipeline -> add observability -> containerize. Don't demand big-bang rewrites.

## Anti-Patterns

- Unmaintained templates (accumulating security debt)
- One template for all (too rigid)
- Too many templates (analysis paralysis)
- No escape hatch (developers circumvent the platform)
