# Cloud Data Protection

Encryption at rest and in transit, key management, data loss prevention, and key rotation strategies.

## When to Load

- Implementing encryption for storage, databases, or message queues
- Setting up KMS key policies and rotation
- Designing DLP controls to prevent sensitive data exposure
- Audit preparation for data-at-rest encryption requirements
- Cross-account or cross-region key sharing

## Key Concepts

**Encryption at Rest**
- Server-side encryption (SSE): cloud provider manages encryption transparently
- Customer-managed keys (CMK): you control key policy, rotation, and access
- Client-side encryption: encrypt before sending to cloud (highest control)
- Envelope encryption: data key encrypts data, master key encrypts data key

**Encryption in Transit**
- TLS 1.2+ for all external and internal service communication
- mTLS between microservices (service mesh or application-level)
- VPN/PrivateLink for cross-account or hybrid connectivity
- Certificate pinning for mobile/client applications (use with caution)

**Key Management Best Practices**
- Separate keys per environment (prod/staging/dev)
- Separate keys per data classification level
- Key policy: least privilege -- only services that need decrypt get it
- Automatic rotation: 90 days for symmetric, manual for asymmetric
- Multi-region keys for disaster recovery scenarios
- Deletion protection: 7-30 day waiting period before key destruction

**Data Loss Prevention**
- Classification: tag data by sensitivity (PII, PHI, financial, public)
- Detection: scan storage for untagged sensitive data (Macie, DLP API)
- Prevention: block exfiltration via VPC endpoints, S3 bucket policies
- Monitoring: alert on bulk downloads, unusual access patterns
- Tokenization: replace sensitive values with non-reversible tokens where possible

## Patterns

```json
// KMS key policy: app can encrypt/decrypt, admin can manage
{
  "Statement": [
    {
      "Sid": "AdminManageKey",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:role/KeyAdmin"},
      "Action": ["kms:Create*", "kms:Describe*", "kms:Enable*", "kms:List*",
                 "kms:Put*", "kms:Update*", "kms:Revoke*", "kms:Disable*",
                 "kms:Get*", "kms:Delete*", "kms:ScheduleKeyDeletion"],
      "Resource": "*"
    },
    {
      "Sid": "AppUseKey",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789012:role/AppRole"},
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "*"
    }
  ]
}
```

```hcl
# Terraform: S3 bucket with CMK encryption + versioning
resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data_key.arn
    }
    bucket_key_enabled = true
  }
}
```

**Rotation Strategy**
- Symmetric KMS keys: enable automatic rotation (AWS rotates backing key yearly)
- Application secrets: rotate via Secrets Manager with Lambda rotation function
- Database credentials: dual-user rotation pattern for zero-downtime
- API keys: overlap period where both old and new keys are valid

## Gotchas

- KMS has request rate limits (5500-30000 req/s depending on region) -- use data key caching
- Cross-account key sharing requires both key policy AND IAM policy grants
- Bucket keys reduce KMS calls for S3 but change the encryption context
- Key deletion is irreversible after waiting period -- audit before scheduling
- DLP scanning costs scale with data volume; scan incrementally, not full sweeps
- Client-side encryption means you lose server-side search/index capabilities

## Verification

- Confirm all storage resources show encryption enabled (aws s3api get-bucket-encryption)
- Attempt access without decrypt permission -- should fail with AccessDenied
- Verify key rotation: check key metadata shows rotation enabled and last rotation date
- Run Macie/DLP scan on sample bucket; confirm it detects planted test PII
- Test cross-region failover with multi-region key -- decrypt must work in DR region
- Audit CloudTrail for KMS Decrypt calls from unexpected principals
