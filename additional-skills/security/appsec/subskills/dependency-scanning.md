---
type: subskill
title: "Dependency Scanning"
---

# Dependency Scanning

## Core Concepts

- Third-party dependencies inherit their vulnerabilities into your application
- SCA (Software Composition Analysis) identifies known CVEs in your dependency tree
- Transitive dependencies (deps of deps) carry risk you didn't explicitly accept
- License compliance: some licenses have requirements incompatible with your distribution model
- SBOM (Software Bill of Materials) provides an inventory for vulnerability response

## Key Practices

- Run SCA in CI on every build: fail on critical/high severity vulnerabilities
- Pin dependency versions: avoid floating ranges that silently introduce vulnerable versions
- Monitor for new CVEs in existing dependencies: tools like Dependabot, Snyk, or Trivy
- Review transitive dependencies: a single direct dep may pull in 50+ transitive packages
- Generate and maintain SBOM: enables rapid response when new vulnerabilities are disclosed

## Common Mistakes

- Only scanning direct dependencies: the vulnerability is usually in a transitive dep
- Ignoring findings because "we don't use that function" — attackers find paths you didn't consider
- Updating dependencies without testing: the fix breaks something, so teams stop updating

## When to Apply

- Setting up security automation for any project with external dependencies
- Responding to a newly disclosed vulnerability (need to know if you're affected)
- Compliance or audit requires evidence of dependency risk management
- Evaluating new dependencies before adding them to the project
