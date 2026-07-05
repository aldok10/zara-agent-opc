---
type: subskill
title: "Attack Surface Analysis"
---

# Attack Surface Analysis

## Core Concepts
- Attack surface = sum of all points where an attacker can inject data or extract information
- Categories: network (open ports, protocols), application (endpoints, inputs), human (phishing, social)
- Smaller attack surface = fewer opportunities for exploitation
- Attack surface grows with features, integrations, and deployment complexity
- Quantify by counting: entry points, privilege levels, data assets exposed

## Key Practices
- Enumerate all entry points: APIs, web forms, file uploads, message queues, admin interfaces
- Map each entry point to required authentication level and exposed data sensitivity
- Identify unnecessary features/endpoints and disable or remove them (reduce surface)
- Review third-party integrations as extended attack surface (SDK vulnerabilities, callback URLs)
- Reassess after every feature addition, dependency update, or infrastructure change

## Common Mistakes
- Ignoring internal/debug endpoints exposed in production (health checks, profiling, metrics)
- Treating mobile/CLI clients as trusted (same attack surface as any external client)
- Only analyzing web-facing surface while ignoring message brokers, cron jobs, and batch processors

## When to Apply
- Pre-launch security review of new applications or major features
- Evaluating the security impact of adding a new integration or third-party service
- Prioritizing penetration testing scope based on exposure risk
