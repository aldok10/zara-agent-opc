---
type: fact
title: "Compliance as Code"
---

# Compliance as Code

## Core Concept

Encode compliance requirements as machine-readable policies that run automatically in CI/CD pipelines and cloud environments. Shift from periodic manual audits to continuous automated verification.

## Policy Engines

### OPA (Open Policy Agent) with Rego
- General-purpose policy engine, decoupled from enforcement point
- Rego language: declarative, logic-based, purpose-built for policy
- Use cases: Kubernetes admission, API authorization, Terraform plans, data filtering
- Deployment: sidecar, daemon, library, or centralized service
- Bundles: package and distribute policies as versioned artifacts

```rego
# Deny public S3 buckets
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "aws_s3_bucket_acl"
    resource.values.acl == "public-read"
    msg := sprintf("Bucket %v must not be public", [resource.name])
}
```

### Checkov
- IaC scanning for Terraform, CloudFormation, Kubernetes, Dockerfile
- 1000+ built-in checks mapped to CIS, SOC2, HIPAA, PCI
- Custom checks in Python or YAML
- Graph-based analysis for cross-resource relationships
- Integrates with Bridgecrew platform for drift detection

### ScoutSuite
- Multi-cloud security auditing (AWS, Azure, GCP, Oracle, Alibaba)
- Generates HTML report with findings by service
- Rule-based assessment against cloud provider best practices
- Point-in-time snapshot; good for initial assessments
- No agent required, uses cloud API credentials

### Cloud Custodian
- Rules engine for cloud resource management
- YAML policy definitions with filters and actions
- Real-time mode: responds to CloudTrail/EventBridge events
- Actions: tag, notify, stop, terminate, remediate
- Best for: automated enforcement and cost governance

```yaml
policies:
  - name: unencrypted-ebs
    resource: ebs
    filters:
      - Encrypted: false
    actions:
      - type: notify
        to: [security-team@company.com]
        transport:
          type: sns
          topic: arn:aws:sns:us-east-1:123:alerts
```

## Audit-Ready Pipeline Design

### Evidence Collection
- Every policy check produces timestamped, immutable evidence
- Store in append-only log (S3 with Object Lock, or dedicated GRC tool)
- Link evidence to specific control IDs (e.g., SOC2 CC6.1)
- Retain per compliance framework requirements (typically 1-7 years)

### Pipeline Stages
1. **Pre-commit**: developer-facing checks (secrets, basic linting)
2. **PR gate**: IaC policy checks (Checkov, OPA on Terraform plan)
3. **Build**: container image scanning, SBOM generation
4. **Deploy gate**: admission control (OPA/Gatekeeper in Kubernetes)
5. **Runtime**: continuous monitoring (CSPM, Cloud Custodian)

### Control Mapping
- Map each automated check to compliance control IDs
- Maintain mapping document: check name → framework → control → evidence type
- When auditor asks about CC7.2, point to specific pipeline stage + stored results

## Framework-Specific Automation

### SOC 2
- Change management: Git history + PR approvals = evidence
- Access reviews: automated IAM reports on schedule
- Monitoring: alert acknowledgment logs as evidence
- Vendor management: automated SCA for third-party dependencies

### PCI DSS
- Network segmentation: policy-as-code for security groups
- Encryption: Checkov rules for encryption-at-rest and in-transit
- Access control: IAM policy analysis for least privilege
- Log monitoring: automated alerting rules with evidence of review

### HIPAA
- PHI data classification: tag enforcement via Cloud Custodian
- Encryption requirements: OPA policies on storage resources
- Audit logging: CloudTrail/audit log enablement checks
- BAA tracking: automated inventory of services processing PHI

## Implementation Approach

### Start Small
- Pick 5-10 highest-risk controls to automate first
- Choose controls that fail most often in manual audits
- Build confidence with team before expanding scope

### Governance Model
- Security team owns policy definitions
- Platform team owns enforcement infrastructure
- Development teams own remediation of their resources
- Exception process: time-bound, approved, tracked, re-evaluated

### Metrics
- % of controls with automated evidence vs manual
- Mean time between policy violation and remediation
- Audit preparation time (target: hours, not weeks)
- Policy exception count and age distribution
