---
type: example
title: "SOC2 Evidence Collection Automation"
---

# SOC2 Evidence Collection Automation

## Context
When preparing for SOC2 Type II audits and need to continuously collect evidence for Trust Service Criteria. Manual evidence gathering is error-prone and time-consuming. Automate collection for access reviews, change management, and monitoring controls.

## Code/Template

```typescript
// scripts/soc2-evidence-collector.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { IAMClient, ListUsersCommand, ListMFADevicesCommand } from '@aws-sdk/client-iam';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';

interface EvidenceReport {
  controlId: string;
  criteria: string;
  collectedAt: string;
  period: { start: string; end: string };
  findings: Finding[];
  status: 'pass' | 'fail' | 'review_needed';
}

interface Finding {
  resource: string;
  compliant: boolean;
  detail: string;
}

// CC6.1 - Logical Access Controls: MFA Enforcement
async function collectMfaEvidence(iam: IAMClient): Promise<EvidenceReport> {
  const users = await iam.send(new ListUsersCommand({}));
  const findings: Finding[] = [];

  for (const user of users.Users ?? []) {
    const mfa = await iam.send(
      new ListMFADevicesCommand({ UserName: user.UserName })
    );

    findings.push({
      resource: user.UserName!,
      compliant: (mfa.MFADevices?.length ?? 0) > 0,
      detail: mfa.MFADevices?.length
        ? `MFA enabled: ${mfa.MFADevices[0].SerialNumber}`
        : 'No MFA device configured',
    });
  }

  const nonCompliant = findings.filter((f) => !f.compliant);

  return {
    controlId: 'CC6.1-MFA',
    criteria: 'All IAM users must have MFA enabled',
    collectedAt: new Date().toISOString(),
    period: {
      start: new Date(Date.now() - 30 * 86400000).toISOString(),
      end: new Date().toISOString(),
    },
    findings,
    status: nonCompliant.length === 0 ? 'pass' : 'fail',
  };
}

// CC8.1 - Change Management: All prod changes via PR
async function collectChangeManagementEvidence(): Promise<EvidenceReport> {
  const response = await fetch(
    'https://api.github.com/repos/org/app/pulls?state=closed&base=main&per_page=100',
    { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
  );
  const prs = await response.json();

  const findings: Finding[] = prs.map((pr: any) => ({
    resource: `PR #${pr.number}: ${pr.title}`,
    compliant: pr.merged_at !== null && pr.review_comments > 0,
    detail: pr.merged_at
      ? `Merged with ${pr.review_comments} review comments, approved by ${pr.requested_reviewers?.length ?? 0} reviewers`
      : 'Closed without merge',
  }));

  const directPushes = findings.filter((f) => !f.compliant);

  return {
    controlId: 'CC8.1-CHANGE',
    criteria: 'All production changes require peer review before merge',
    collectedAt: new Date().toISOString(),
    period: {
      start: new Date(Date.now() - 30 * 86400000).toISOString(),
      end: new Date().toISOString(),
    },
    findings,
    status: directPushes.length === 0 ? 'pass' : 'review_needed',
  };
}

// CC7.2 - Monitoring: Security events are logged
async function collectMonitoringEvidence(
  cloudtrail: CloudTrailClient
): Promise<EvidenceReport> {
  const events = await cloudtrail.send(
    new LookupEventsCommand({
      LookupAttributes: [
        { AttributeKey: 'EventName', AttributeValue: 'ConsoleLogin' },
      ],
      StartTime: new Date(Date.now() - 7 * 86400000),
      EndTime: new Date(),
    })
  );

  const findings: Finding[] = (events.Events ?? []).map((event) => ({
    resource: event.Username ?? 'unknown',
    compliant: true,
    detail: `Login at ${event.EventTime?.toISOString()} from ${event.CloudTrailEvent ? JSON.parse(event.CloudTrailEvent).sourceIPAddress : 'unknown'}`,
  }));

  return {
    controlId: 'CC7.2-MONITOR',
    criteria: 'All console logins are captured in CloudTrail',
    collectedAt: new Date().toISOString(),
    period: {
      start: new Date(Date.now() - 7 * 86400000).toISOString(),
      end: new Date().toISOString(),
    },
    findings,
    status: 'pass',
  };
}

// Main: collect all evidence and upload to S3
async function main() {
  const s3 = new S3Client({});
  const iam = new IAMClient({});
  const cloudtrail = new CloudTrailClient({});

  const reports = await Promise.all([
    collectMfaEvidence(iam),
    collectChangeManagementEvidence(),
    collectMonitoringEvidence(cloudtrail),
  ]);

  const timestamp = new Date().toISOString().slice(0, 10);

  for (const report of reports) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.EVIDENCE_BUCKET,
        Key: `soc2/${timestamp}/${report.controlId}.json`,
        Body: JSON.stringify(report, null, 2),
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
      })
    );

    const icon = report.status === 'pass' ? '[PASS]' : '[FAIL]';
    console.log(`${icon} ${report.controlId}: ${report.findings.length} items checked`);
  }
}

main().catch(console.error);
```

```yaml
# Schedule via GitHub Actions (weekly collection)
name: SOC2 Evidence Collection
on:
  schedule:
    - cron: '0 6 * * 1' # Every Monday 6am UTC
  workflow_dispatch: {}

jobs:
  collect:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/soc2-collector
          aws-region: us-east-1
      - run: npx tsx scripts/soc2-evidence-collector.ts
        env:
          EVIDENCE_BUCKET: company-compliance-evidence
          GITHUB_TOKEN: ${{ secrets.GH_AUDIT_TOKEN }}
```

## Key Points
- Collect evidence continuously (weekly), not just before audits—auditors want to see consistent compliance over the observation period
- Store evidence immutably in S3 with versioning and KMS encryption; auditors need tamper-proof records
- Automate the "pass/fail" determination so non-compliance triggers alerts before the auditor finds it
