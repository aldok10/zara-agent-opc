# SOC 2 Compliance

Trust Service Criteria implementation, evidence collection, and continuous compliance monitoring.

## When to Load

- Preparing for SOC 2 Type I or Type II audit
- Building continuous compliance monitoring
- Mapping controls to Trust Service Criteria
- Automating evidence collection for auditors

## Key Concepts

**Trust Service Criteria (TSC)**
- CC (Common Criteria): foundation -- applies to all engagements
- Availability: system uptime commitments and recovery
- Confidentiality: protection of designated confidential data
- Processing Integrity: accurate, complete, timely processing
- Privacy: personal information lifecycle management

**Type I vs Type II**
- Type I: point-in-time design effectiveness (snapshot)
- Type II: operating effectiveness over period (usually 6-12 months)
- Type II requires evidence that controls operated consistently
- First audit is often Type I; subsequent audits are Type II

**Key Control Areas**
- Access control: provisioning, deprovisioning, periodic reviews
- Change management: PR reviews, approval gates, deployment controls
- Incident response: documented process, tested runbooks
- Risk assessment: annual formal assessment with treatment plans
- Vendor management: third-party risk assessments, contracts
- Monitoring: alerting, log retention, anomaly detection

**Evidence Collection**
- Screenshots: point-in-time proof (access reviews, configurations)
- System exports: user lists, audit logs, configuration dumps
- Process artifacts: tickets, PR approvals, deployment records
- Meeting notes: risk assessments, security committee minutes

## Patterns

```yaml
# Continuous compliance monitoring config
controls:
  CC6.1-access-provisioning:
    evidence_sources:
      - type: api_export
        source: okta
        query: users_with_roles
        frequency: weekly
      - type: ticketing
        source: jira
        query: "project = IT AND type = 'Access Request' AND status = Done"
    assertions:
      - all_users_have_approved_access_request
      - no_orphaned_accounts_older_than_24h

  CC7.2-monitoring:
    evidence_sources:
      - type: dashboard_screenshot
        source: datadog
        url: /dashboard/security-monitoring
        frequency: monthly
      - type: alert_export
        source: pagerduty
        query: last_90_days_security_alerts
    assertions:
      - alerts_acknowledged_within_sla
      - no_unresolved_critical_alerts_beyond_72h

  CC8.1-change-management:
    evidence_sources:
      - type: api_export
        source: github
        query: merged_prs_with_approvals
        frequency: monthly
    assertions:
      - all_production_changes_have_approval
      - no_direct_commits_to_main
```

**Automation Opportunities**
- Access reviews: pull from IdP, compare to approved roles, flag drift
- Change evidence: GitHub API exports merged PRs with review metadata
- Uptime evidence: SLA dashboards exported automatically
- Vulnerability scanning: scheduled scans with archived reports

## Gotchas

- Auditors want consistent evidence over the period -- gaps are findings
- "We do it but don't document it" is the same as not doing it
- Compensating controls must be explicitly mapped and justified
- Shared responsibility (cloud provider) still requires your layer of evidence
- SOC 2 scope creep: define system boundaries clearly upfront

## Verification

- Map every TSC criterion to at least one control with evidence source
- Confirm evidence collection automation produces expected artifacts
- Run mock audit: have internal team request evidence for random controls
- Verify retention: evidence from 12 months ago is still accessible
- Test exception/deviation handling process end-to-end
