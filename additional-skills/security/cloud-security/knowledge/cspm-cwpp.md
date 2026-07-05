---
type: fact
title: "CSPM & CWPP Platforms"
---

# Cloud Security Posture Management & Workload Protection

## CSPM (Cloud Security Posture Management)

### What It Does
- Continuous assessment of cloud infrastructure configuration
- Detects misconfigurations: open S3 buckets, overly permissive IAM, unencrypted storage
- Maps findings to compliance frameworks (CIS, SOC 2, PCI DSS, HIPAA)
- Attack path analysis: chains of misconfigurations that create exploitable paths

### Key Capabilities
- Multi-cloud visibility (AWS, Azure, GCP, OCI)
- Infrastructure drift detection from baseline
- Identity analysis: effective permissions, unused privileges
- Network exposure mapping
- Auto-remediation for known-safe fixes

## CWPP (Cloud Workload Protection Platform)

### What It Does
- Runtime protection for VMs, containers, serverless functions
- Vulnerability scanning of OS packages and application dependencies
- Runtime threat detection: anomalous process execution, network connections
- File integrity monitoring

### Key Capabilities
- Container image scanning in registry and at runtime
- Kubernetes admission control (block vulnerable images)
- Host-based intrusion detection
- Serverless function behavioral analysis
- Network microsegmentation enforcement

## Platform Comparison

### Wiz
- Agentless-first architecture (API-based scanning)
- Graph-based attack path visualization
- Fast deployment: no agents to install, connects via cloud APIs
- Strong identity analysis and effective permissions
- Best for: rapid posture assessment, exec-friendly dashboards
- Limitation: runtime protection requires additional agent

### Prisma Cloud (Palo Alto)
- Full lifecycle: code to cloud (CSPM + CWPP + CIEM + DSPM)
- Shift-left: IaC scanning, CI/CD pipeline integration
- Agent-based runtime protection (Defenders)
- Best for: organizations wanting single-pane-of-glass
- Limitation: complexity, longer time to value

### Orca Security
- SideScanning: agentless via snapshot analysis
- Combines CSPM + CWPP + vulnerability management
- Asset discovery including shadow IT
- Best for: full visibility without agent overhead
- Limitation: runtime detection gaps without agents

## Deployment Patterns

### Agentless vs Agent-Based
- Agentless: faster deployment, lower overhead, periodic snapshots
- Agent-based: real-time detection, runtime blocking, higher fidelity
- Hybrid approach: agentless for posture, agents for critical workloads

### Multi-Cloud Strategy
- Normalize findings across clouds to common severity model
- Cloud-specific benchmarks (CIS AWS, CIS Azure, CIS GCP)
- Unified identity governance across cloud providers
- Centralized alerting with cloud-specific remediation playbooks

## Implementation Priorities

### Phase 1: Visibility (Week 1-2)
- Connect cloud accounts (read-only roles)
- Inventory all assets and their exposure
- Baseline current posture score

### Phase 2: Risk Reduction (Week 3-6)
- Address critical/high findings (internet-exposed + vulnerable)
- Implement guardrails for new deployments
- Enable drift detection on production accounts

### Phase 3: Runtime (Month 2-3)
- Deploy agents on high-value workloads
- Container scanning in CI/CD pipeline
- Kubernetes admission policies

### Phase 4: Governance (Month 3+)
- Compliance reporting automation
- Exception management workflow
- SLA tracking for remediation by severity

## Alert Fatigue Mitigation
- Prioritize by exploitability, not just severity
- Context-aware: internet-facing + contains sensitive data = critical
- Suppress known-accepted risks with documented exceptions
- Group related findings into attack paths rather than individual alerts
