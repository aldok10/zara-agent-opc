# AWS IAM

Identity and access management covering policies, roles, federation, and organizational controls.

## When to Load
- Designing IAM policies or role trust relationships
- Setting up cross-account access or OIDC federation
- Implementing SCPs or permission boundaries
- Troubleshooting access denied errors

## Key Concepts

**Policy types (evaluation order):**
1. SCPs (org-level deny guardrails)
2. Permission boundaries (max permissions ceiling)
3. Identity policies (attached to principal)
4. Resource policies (attached to resource)
5. Session policies (scoped at assume time)

**Effective permissions:** intersection of all applicable policy types. Explicit deny always wins.

**Principal types:** IAM users, IAM roles, federated identities, service-linked roles, root account.

**OIDC federation:** GitHub Actions, EKS pods, external IdPs assume roles via `sts:AssumeRoleWithWebIdentity`.

## Patterns

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::bucket-name/prefix/*",
    "Condition": {
      "StringEquals": {"aws:PrincipalOrgID": "o-xxx"}
    }
  }]
}
```

**Role trust for GitHub Actions OIDC:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"},
      "StringLike": {"token.actions.githubusercontent.com:sub": "repo:org/repo:*"}
    }
  }]
}
```

**SCP deny pattern (prevent region escape):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {"aws:RequestedRegion": ["us-east-1", "eu-west-1"]},
      "ArnNotLike": {"aws:PrincipalARN": "arn:aws:iam::*:role/OrganizationAdmin"}
    }
  }]
}
```

## Gotchas
- Wildcards in resource ARNs: `s3:*` on `*` gives access to ALL buckets
- `NotAction` + `Allow` is not a deny -- it grants everything EXCEPT listed actions
- Permission boundaries don't grant -- they only limit what identity policies can grant
- SCPs don't affect the management account
- `sts:AssumeRole` session duration capped at role's MaxSessionDuration
- Cross-account S3 access needs both identity policy AND bucket policy

## Verification
- `aws iam simulate-principal-policy` to test effective permissions
- `aws sts get-caller-identity` to confirm assumed role
- CloudTrail for actual API call audit
- IAM Access Analyzer for external/unused access findings
- `aws organizations list-policies-for-target` to see applied SCPs
