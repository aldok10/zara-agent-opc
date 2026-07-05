---
type: subskill
title: "Container Security Scanning"
---

# Container Security Scanning

## Core Concepts
- Image scanning detects known vulnerabilities (CVEs) in OS packages and application dependencies
- Scan points: build time (CI pipeline), registry (admission), runtime (continuous monitoring)
- Vulnerability databases: NVD, GitHub Advisory, vendor-specific feeds
- Severity prioritization: not all CVEs are exploitable in your context—assess reachability
- Scanning covers layers, configurations (misconfigs), secrets, and SBOM generation

## Key Practices
- Scan in CI and block promotion on critical/high severity findings with fix available
- Use admission controllers (OPA/Gatekeeper, Kyverno) to prevent unscanned images from deploying
- Regularly rescan deployed images—new CVEs are disclosed against existing packages
- Configure allow-lists for accepted risks with documented justification and expiry dates
- Combine static scanning with runtime detection (drift monitoring, unexpected processes)

## Common Mistakes
- Scanning only at build time and ignoring vulnerabilities discovered post-deployment
- Treating all CVEs equally instead of assessing exploitability in the specific context
- Ignoring base image vulnerabilities because "it's the official image"

## When to Apply
- Setting up container-based CI/CD pipelines with security gates
- Hardening existing container deployments for compliance requirements
- Responding to new critical CVE announcements affecting base images
