---
type: tool
title: "Key Rotation Plan Prompt"
---

# Key Rotation Plan Prompt

## Purpose
Design a key rotation strategy with scheduling, automation, and zero-downtime procedures for cryptographic key management.

## When to Use
- Implementing key rotation for the first time
- Planning rotation after a potential key compromise
- Designing automated key lifecycle management
- Meeting compliance requirements for key freshness

## Prompt Template

```
You are a cryptography operations engineer designing a key rotation plan.

CONTEXT:
- Key management system: {aws_kms|hashicorp_vault|azure_keyvault|gcp_kms|custom}
- Key types to rotate: {encryption_at_rest|signing|tls|api_keys|jwt_signing|ssh}
- Systems affected: {list_services_using_keys}
- Current rotation: {never|manual|some_automated}
- Compliance requirement: {rotation_period_required}

FOR EACH KEY TYPE:

1. ROTATION SCHEDULE
   - Rotation period (based on risk and compliance)
   - Grace period (old key valid for decryption/verification)
   - Emergency rotation trigger criteria
   - Calendar: stagger rotations to avoid simultaneous changes

2. ZERO-DOWNTIME PROCEDURE
   - Step 1: Generate new key version (new key active for encryption)
   - Step 2: Deploy new key to all services (rolling update)
   - Step 3: Old key remains valid for decryption only
   - Step 4: Re-encrypt data with new key (if required)
   - Step 5: Disable old key after grace period
   - Step 6: Delete old key after retention period
   - Rollback plan at each step

3. AUTOMATION DESIGN
   - Trigger: scheduled cron / event-driven / manual approval
   - Key generation: automated via KMS API
   - Distribution: how services pick up new key (reload, restart, env)
   - Validation: verify new key works before decommissioning old
   - Notification: alert operators on rotation success/failure

4. DATA RE-ENCRYPTION
   - Is re-encryption required or optional?
   - Batch re-encryption strategy (background, off-peak)
   - Progress tracking and resumability
   - Verification: all data accessible with new key

5. MONITORING AND ALERTING
   - Key age alerts (approaching rotation deadline)
   - Failed rotation alerts
   - Key usage anomalies (old key still being used past grace)
   - Audit trail of all rotation events

RULES:
- Never delete old key before confirming all data is re-encrypted or accessible
- Dual-write period: both old and new keys accepted during transition
- Test rotation in non-production first, every time
- Document which data is encrypted with which key version
- Emergency rotation must be executable within {target_hours}
```

## Output Format

```markdown
## Key Rotation Plan

### Schedule
| Key Type | Rotation Period | Grace Period | Re-encrypt Required |
|----------|----------------|-------------|---------------------|

### Procedure (per key type)
| Step | Action | Verification | Rollback |
|------|--------|-------------|----------|

### Automation Runbook
[Scripted steps or IaC for rotation]

### Emergency Rotation
- Trigger criteria: [when to rotate immediately]
- Timeline: [target completion time]
- Communication: [who to notify]

### Monitoring
| Alert | Condition | Action |
```
