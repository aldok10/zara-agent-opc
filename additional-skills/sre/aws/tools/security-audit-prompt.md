# AWS Security Audit Prompt

You are performing a security review of an AWS account or set of accounts. Analyze the provided configuration, CloudTrail logs, IAM policies, and infrastructure-as-code to identify security issues.

## Review Framework

### 1. Identity and Access Management
- Are there IAM users with long-lived access keys? When were they last rotated?
- Do any policies use `Action: "*"` or `Resource: "*"` without justification?
- Are permission boundaries applied to all human-created roles?
- Is MFA enforced for console access and sensitive operations?
- Are there cross-account trust policies with overly broad principals?
- Are service-linked roles used where available instead of custom roles?
- Check for privilege escalation paths (e.g., iam:PassRole + lambda:CreateFunction)

### 2. Network Security
- Are there security groups with 0.0.0.0/0 ingress on non-HTTP(S) ports?
- Are data-tier subnets isolated with no internet route?
- Are VPC endpoints used for high-traffic AWS service calls?
- Are flow logs enabled at VPC level?
- Are NACLs used to block known malicious CIDR ranges?
- Is the VPC peering or Transit Gateway segmented by environment?

### 3. Data Protection
- Are S3 buckets encrypted with SSE-KMS (not just SSE-S3) for sensitive data?
- Is public access blocked at the account level (S3 Block Public Access)?
- Are RDS instances encrypted at rest and in transit (enforce SSL)?
- Are EBS volumes encrypted by default?
- Are KMS key policies following least privilege?
- Is versioning enabled on critical S3 buckets?
- Are there any public S3 buckets or objects?

### 4. Logging and Detection
- Is CloudTrail enabled in all regions with management + data events?
- Is CloudTrail log file validation enabled?
- Is GuardDuty enabled in all accounts and regions?
- Are Config rules active for critical compliance checks?
- Are CloudWatch alarms set for: root login, IAM changes, SG changes?
- Is Security Hub enabled with findings aggregated to a central account?

### 5. Compute Security
- Are EC2 instances using IMDSv2 only (HttpTokens: required)?
- Are Lambda functions using the latest runtime versions?
- Are ECS tasks using Fargate or hardened AMIs?
- Are SSM Session Manager logs enabled (replacing SSH bastion)?
- Are container images scanned for vulnerabilities (ECR scanning)?

### 6. Infrastructure as Code
- Are there any hardcoded secrets in Terraform/CloudFormation?
- Are state files encrypted and access-controlled?
- Is `prevent_destroy` set on critical resources?
- Are modules pinned to specific versions (not `latest`)?
- Is drift detection configured?

## Output Format

For each finding:
```
[SEVERITY: CRITICAL|HIGH|MEDIUM|LOW|INFO]
Resource: <ARN or identifier>
Issue: <concise description>
Risk: <what could happen if exploited>
Remediation: <specific fix with code/CLI example>
Reference: <AWS doc or CIS benchmark control>
```

## Prioritization

1. CRITICAL: Active exposure (public data, credential leak, no MFA on root)
2. HIGH: Exploitable with moderate effort (overly permissive IAM, open SGs)
3. MEDIUM: Defense in depth gaps (missing encryption, no flow logs)
4. LOW: Best practice deviations (naming, tagging, non-enforced recommendations)
5. INFO: Observations for future improvement

## Context to Provide

When using this prompt, include:
- Terraform plan output or live resource descriptions
- IAM policy documents (JSON)
- Security group rules
- CloudTrail findings or GuardDuty alerts
- Account structure (Organizations, OUs)
- Compliance requirements (SOC2, HIPAA, PCI-DSS if applicable)
