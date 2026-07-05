---
type: example
title: "AWS Service Control Policy Guardrails"
---

# AWS Service Control Policy (Guardrails)

## Context
When you need preventive controls across an AWS Organization that cannot be bypassed - even by account administrators. SCPs define the maximum permissions boundary for all IAM entities in member accounts.

## Code/Template

```json
// scp-deny-dangerous-actions.json
// Prevents critical security misconfigurations across all accounts
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyRootAccountUsage",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:root"
        }
      }
    },
    {
      "Sid": "DenyLeavingOrganization",
      "Effect": "Deny",
      "Action": [
        "organizations:LeaveOrganization"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyDisablingCloudTrail",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:DeleteTrail",
        "cloudtrail:StopLogging",
        "cloudtrail:UpdateTrail",
        "cloudtrail:PutEventSelectors"
      ],
      "Resource": "arn:aws:cloudtrail:*:*:trail/organization-trail",
      "Condition": {
        "StringNotLike": {
          "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityAuditRole"
        }
      }
    },
    {
      "Sid": "DenyDisablingGuardDuty",
      "Effect": "Deny",
      "Action": [
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromMasterAccount",
        "guardduty:UpdateDetector"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyPublicS3",
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock",
        "s3:PutAccountPublicAccessBlock"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-acl": "private"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": ["aws:kms", "AES256"]
        },
        "Null": {
          "s3:x-amz-server-side-encryption": "false"
        }
      }
    }
  ]
}
```

```json
// scp-enforce-region-restriction.json
// Restrict workloads to approved regions only
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyNonApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "organizations:*",
        "route53:*",
        "budgets:*",
        "waf:*",
        "cloudfront:*",
        "globalaccelerator:*",
        "importexport:*",
        "support:*",
        "sts:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        }
      }
    }
  ]
}
```

```json
// scp-require-imdsv2.json
// Force EC2 instances to use IMDSv2 (prevents SSRF metadata theft)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireIMDSv2",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringNotEquals": {
          "ec2:MetadataHttpTokens": "required"
        }
      }
    },
    {
      "Sid": "DenyIMDSv1Modification",
      "Effect": "Deny",
      "Action": "ec2:ModifyInstanceMetadataOptions",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:MetadataHttpTokens": "optional"
        }
      }
    }
  ]
}
```

```hcl
# Terraform: Attach SCPs to OUs
resource "aws_organizations_policy" "deny_dangerous" {
  name        = "deny-dangerous-actions"
  description = "Prevent critical security misconfigurations"
  type        = "SERVICE_CONTROL_POLICY"
  content     = file("${path.module}/scp-deny-dangerous-actions.json")
}

resource "aws_organizations_policy_attachment" "workloads_ou" {
  policy_id = aws_organizations_policy.deny_dangerous.id
  target_id = aws_organizations_organizational_unit.workloads.id
}
```

## Key Points
- SCPs are deny-only guardrails - they never grant permissions, only restrict the maximum boundary
- Always exclude global services (IAM, Route53, CloudFront) from region restrictions or you'll break cross-region functionality
- Test SCPs in a sandbox OU first; a misconfigured SCP can lock out all users in an account including the root
