# Incident Response

Based on NIST SP 800-61. Adapted for engineering teams.

## 1. Preparation

Before incidents happen:

- IR plan documented and accessible (not buried in Confluence)
- Communication tree: who to call, escalation paths, external contacts (legal, PR)
- Access to production logs, metrics, and traces pre-staged
- Forensic tooling ready: disk imaging, memory capture, log export scripts
- Backups verified (actually test restore, not just "backups run")
- Playbooks for common scenarios: credential leak, data breach, ransomware, DDoS
- Regular tabletop exercises (quarterly minimum)

## 2. Detection & Analysis

How you know something is wrong:

**Indicators**: security alerts, anomaly detection, user reports, threat intel feeds, unexpected resource usage, third-party notification.

**Severity classification**:

| Level | Criteria | Response Time | Example |
|-------|----------|---------------|---------|
| P1 | Active data breach, production down | Immediate | Attacker exfiltrating data |
| P2 | Confirmed compromise, contained | < 1 hour | Compromised service account |
| P3 | Vulnerability with exploit available | < 24 hours | Critical CVE, exposed service |
| P4 | Potential issue, low confidence | Next business day | Suspicious log pattern |

**Evidence preservation**: before you fix anything, capture logs, memory dumps, network captures. You can't investigate what you've already cleaned up.

## 3. Containment

Stop the bleeding without destroying evidence.

**Short-term** (minutes):
- Isolate affected systems (network segmentation, security groups)
- Block attacker IPs/ranges at WAF/firewall
- Revoke compromised tokens and sessions
- Disable compromised accounts

**Long-term** (hours/days):
- Patch the vulnerability
- Rebuild from clean images if integrity uncertain
- Rotate all credentials the attacker could have accessed

Decision: observe vs cut off? If actively exfiltrating data, cut immediately. If dormant, brief observation may reveal scope.

## 4. Eradication

Remove the attacker completely:

- Identify root cause (how did they get in?)
- Remove all attacker artifacts (backdoors, cron jobs, modified binaries, new accounts)
- Patch the entry point vulnerability
- Scan for lateral movement (other compromised systems)
- Verify no persistence mechanisms remain

## 5. Recovery

Return to normal operations:

- Restore from known-clean state (not from potentially compromised backups)
- Verify system integrity before reconnecting to production
- Monitor intensively for re-compromise (30 days minimum)
- Gradual service restoration, not big-bang
- Confirm no data integrity issues

## 6. Post-Incident

Learn from it:

- **Blameless retrospective** within 72 hours
- **Timeline**: minute-by-minute of detection, response, resolution
- **What worked**: detection speed, communication, tooling
- **What failed**: gaps, delays, missing access, unclear ownership
- **Action items**: with owners and deadlines (not "we should improve monitoring")
- **Update playbooks** with lessons learned
- **Share** (appropriately sanitized) with broader team

## For Developers Specifically

When your code or infrastructure is breached:

**Credential rotation**:
- All secrets in the affected environment (not just the one you know was leaked)
- API keys, database passwords, signing keys, OAuth secrets
- Service account tokens, SSH keys
- Invalidate all active user sessions

**Dependency audit**:
- Check for compromised packages (was this a supply chain attack?)
- Verify lock file integrity
- Re-run SCA tools against current state

**Git history review**:
- Check for unauthorized commits (force-push to inject backdoor)
- Review recently merged PRs from compromised accounts
- Verify CI/CD pipeline wasn't modified

**Persistence checks**:
- New cron jobs, systemd services, Lambda functions
- Modified startup scripts, docker entrypoints
- New IAM roles/policies, API keys
- Webhook registrations to external URLs
- Modified DNS records
