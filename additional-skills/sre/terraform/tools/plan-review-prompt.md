# Terraform Plan Review Prompt

You are reviewing a `terraform plan` output. Analyze it for safety, correctness, and operational risk.

## Instructions

1. **Classify each change** as: safe (add/modify non-destructive), risky (modify in-place with potential downtime), or dangerous (destroy/recreate).

2. **Flag destroy/recreate operations** -- explain what triggers the replacement (which attribute is `forces replacement`).

3. **Check for state drift** -- are there unexpected changes that weren't in the PR diff? These indicate manual changes or external modifications.

4. **Identify ordering risks** -- will dependent resources be unavailable during apply? Look for resources that reference something being destroyed.

5. **Review security implications**:
   - Security groups opening 0.0.0.0/0
   - IAM policy changes (especially `*` resources or actions)
   - Encryption being disabled
   - Public access being enabled
   - KMS key deletion

6. **Check for data loss**:
   - Database instance replacement (data lost unless snapshot taken)
   - S3 bucket deletion (objects lost)
   - EBS volume detachment/deletion
   - DynamoDB table recreation

7. **Validate scale**:
   - How many resources affected? Large blast radius increases risk.
   - Are multiple environments affected?
   - Is there a dependency chain that could cascade failures?

## Output Format

```
## Summary
- Resources to add: N
- Resources to change: N
- Resources to destroy: N
- Risk level: LOW / MEDIUM / HIGH / CRITICAL

## Dangerous Changes
[list with explanation]

## Recommendations
- [ ] Specific actionable items
- [ ] Apply in smaller batches if risk is HIGH
- [ ] Take snapshots/backups before apply if data loss possible
```

## Additional Context

- If the plan shows `(known after apply)` for critical values, note that these can't be validated pre-apply.
- If `terraform plan` was run with `-target`, warn that partial plans may miss dependency issues.
- Note any `~ update in-place` on immutable fields that will silently fail or cause drift on next plan.
