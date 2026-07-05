---
type: tool
title: "Configuration Drift Detection Prompt"
---

# Configuration Drift Detection Prompt

## Purpose
Detect and remediate configuration drift between declared state (IaC/policy) and actual infrastructure state.

## When to Use
- Investigating why environments have diverged
- Setting up drift detection automation
- After manual changes were made to production
- Compliance audit requiring configuration consistency proof

## Prompt Template

```
You are an infrastructure engineer designing drift detection and remediation.

CONTEXT:
- IaC tool: {terraform|pulumi|cloudformation|ansible|chef}
- Environments: {list_environments_to_monitor}
- Infrastructure scope: {cloud_resources|OS_config|application_config|all}
- Current drift status: {unknown|some_known_drift|clean}
- Change management: {strict_IaC_only|allows_manual|mixed}

DRIFT SOURCES / STATE:
{paste_terraform_plan_output_or_known_differences}

DESIGN THE DRIFT STRATEGY:

1. DETECTION METHODS
   - Scheduled plan/diff (terraform plan, pulumi preview)
   - Agent-based monitoring (config management check-ins)
   - Cloud provider native (AWS Config, Azure Policy, GCP Asset Inventory)
   - Custom scripts comparing desired vs actual
   - Frequency: continuous, hourly, daily, on-demand

2. DRIFT CLASSIFICATION
   - Critical: security-related (SG rules, IAM, encryption settings)
   - High: availability-affecting (scaling settings, health checks, DNS)
   - Medium: operational (tags, descriptions, non-functional settings)
   - Low: cosmetic (naming, annotations)
   - Expected: known manual overrides with documentation

3. ROOT CAUSE ANALYSIS
   - Manual console/CLI changes (who, when, why)
   - Automation outside IaC (scripts, other tools, third-party)
   - Resource auto-modification (AWS auto-scaling modifying desired count)
   - Provider-side changes (AWS updating default settings)
   - Merge conflicts in IaC code

4. REMEDIATION APPROACHES
   - Auto-remediate: revert drift automatically (critical security configs)
   - Alert and wait: notify team, human decides
   - Import to state: bring manual change into IaC (legitimate change)
   - Ignore/suppress: document acceptable drift (dynamic values)
   - Prevent: enforce policies that block manual changes

5. PREVENTION CONTROLS
   - SCPs / IAM policies restricting console access
   - Sentinel / OPA policies on plan output
   - Required approval for non-IaC changes
   - Tagging: all IaC-managed resources tagged for identification
   - State locking and access controls

RULES:
- Not all drift is bad — classify before auto-remediating
- Auto-scaling changes to instance count are expected drift
- Security drift = immediate alert, don't wait for scheduled scan
- Import before overwrite: understand why drift occurred
- Document all "acceptable drift" decisions with expiry dates
```

## Output Format

```markdown
## Drift Detection Report

### Current Drift Summary
| Environment | Resources Drifted | Critical | High | Medium |
|-------------|------------------|----------|------|--------|

### Drift Details
| Resource | Attribute | Expected | Actual | Classification | Action |
|----------|-----------|----------|--------|---------------|--------|

### Root Causes
| Drift Category | Count | Source | Prevention |

### Remediation Plan
| Priority | Resource | Action | Risk | Assignee |

### Automation Setup
- Detection: [tool + schedule]
- Alerting: [channel + routing]
- Auto-remediation: [what's safe to auto-fix]

### Prevention Rules
- [Policy or control to prevent recurrence]
```
