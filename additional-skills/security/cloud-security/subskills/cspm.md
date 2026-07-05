# Cloud Security Posture Management

Continuous monitoring, assessment, and remediation of cloud infrastructure misconfigurations.

## When to Load

- Setting up or evaluating CSPM tooling (Prisma Cloud, Wiz, AWS Config, Azure Policy)
- Automating compliance checks across cloud accounts
- Building remediation pipelines for misconfigurations
- Multi-cloud security posture consolidation

## Key Concepts

**Posture Assessment**
- Asset inventory: full visibility into all cloud resources across accounts/subscriptions
- Configuration drift: detecting when resources deviate from baseline
- Risk scoring: prioritizing findings by exploitability and blast radius
- Continuous vs point-in-time scanning

**Common Misconfigurations**
- Public S3 buckets / storage accounts with open access
- Security groups allowing 0.0.0.0/0 on sensitive ports
- Unencrypted databases or volumes
- IAM policies with wildcard permissions
- Missing logging/monitoring (CloudTrail, Flow Logs)
- Default VPC usage in production

**Automated Remediation**
- Event-driven: CloudWatch Events/EventBridge triggers Lambda for auto-fix
- Guardrails: SCPs and Azure Policy deny non-compliant resource creation
- Self-healing: Config Rules with auto-remediation SSM documents
- Approval gates: high-risk remediations require human approval

## Patterns

```yaml
# AWS Config Rule + Auto Remediation
Resources:
  S3PublicAccessRule:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED

  RemediationConfig:
    Type: AWS::Config::RemediationConfiguration
    Properties:
      ConfigRuleName: !Ref S3PublicAccessRule
      TargetType: SSM_DOCUMENT
      TargetId: AWS-DisableS3BucketPublicReadWrite
      Automatic: true
      MaximumAutomaticAttempts: 3
      RetryAttemptSeconds: 60
```

**Multi-Account Strategy**
- Centralized security account aggregates findings
- Delegated admin for SecurityHub/Config across org
- Account-level guardrails via SCPs prevent disabling security controls
- Regional aggregation for global visibility

## Gotchas

- Auto-remediation can break workloads -- always test in non-prod first
- CSPM tools generate noise; tune severity thresholds before alerting
- Cross-account assume-role permissions need tight scoping
- Some resources (Lambda@Edge, CloudFront) are region-specific; scanners may miss them
- Terraform state and actual state can diverge -- CSPM catches what IaC misses

## Verification

- Run CSPM scan, verify zero critical findings or known-accepted exceptions
- Test auto-remediation by intentionally creating non-compliant resource
- Confirm remediation fires within SLA (typically <15 minutes for critical)
- Validate finding suppression rules don't hide actual issues
- Check coverage: all accounts, all regions, all resource types
