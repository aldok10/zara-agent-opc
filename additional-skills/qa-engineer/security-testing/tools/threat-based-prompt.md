---
type: tool
title: "Threat-Based Security Test Plan Prompt"
---

# Threat-Based Security Test Plan Prompt

## Purpose
Convert STRIDE threat model outputs into executable security test cases with clear pass/fail criteria.

## When to Use
- After completing a threat model and needing test coverage
- When translating threat categories into concrete attack scenarios
- Building security regression tests for a new feature
- Validating that mitigations actually work

## Prompt Template

```
You are a security test engineer converting threat model findings into test cases.

CONTEXT:
- System: {system_name_and_description}
- Threat model source: {STRIDE_analysis|attack_tree|abuse_cases}
- Test tooling: {burp|zap|custom_scripts|playwright}
- Environment: {staging_url_or_local_setup}

THREATS IDENTIFIED:
{paste_threat_model_output_with_STRIDE_categories}

FOR EACH THREAT, GENERATE TEST CASES:

SPOOFING (Identity)
- Attempt auth bypass (missing auth checks, JWT manipulation)
- Token replay after expiry
- Impersonate another user via parameter tampering
- Session fixation/hijacking scenarios

TAMPERING (Integrity)
- Modify request body after auth (price, role, ownership)
- IDOR: access/modify another user's resources
- Bypass client-side validation via direct API calls
- Manipulate file uploads (extension, content-type, payload)

REPUDIATION (Accountability)
- Verify critical actions produce audit log entries
- Attempt action without leaving trace
- Modify/delete own audit trail

INFORMATION DISCLOSURE
- Error messages leaking stack traces or internals
- API responses containing fields user shouldn't see
- Directory listing, debug endpoints in production
- Timing attacks revealing valid usernames

DENIAL OF SERVICE
- Unbounded queries (no pagination limit)
- Resource exhaustion (large file upload, regex, recursion)
- Account lockout abuse (lock out other users)
- Rate limiting effectiveness

ELEVATION OF PRIVILEGE
- Horizontal: access peer user resources
- Vertical: perform admin actions as regular user
- Parameter pollution to gain extra permissions
- Role escalation through workflow manipulation

FOR EACH TEST CASE:
1. Threat ID (from model)
2. STRIDE category
3. Attack scenario (step-by-step)
4. Tool/technique
5. Expected secure behavior
6. Pass/fail criteria
7. Automation feasibility (auto|semi-auto|manual)
```

## Output Format

```markdown
## Security Test Plan

### Coverage Matrix
| Threat ID | STRIDE | Test Case | Tool | Automatable |
|-----------|--------|-----------|------|-------------|

### Test Cases
#### TC-001: {name}
- Threat: {reference}
- Steps: {attack steps}
- Expected: {secure behavior}
- Pass if: {criteria}

### Automation Priority
1. [Tests to automate first - high frequency, easy to script]
2. [Tests requiring manual expertise - complex logic flaws]

### Gaps
- [Threats without feasible test cases + reasoning]
```
