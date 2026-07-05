---
type: tool
title: "Azure Migration Assessment Prompt"
---

# Azure Migration Assessment Prompt

## Purpose
Assess on-premises or other-cloud workloads for migration to Azure, mapping services, identifying blockers, and planning migration waves.

## When to Use
- Planning a datacenter-to-Azure migration
- Evaluating which workloads are cloud-ready
- Mapping on-prem services to Azure equivalents
- Estimating migration effort and timeline

## Prompt Template

```
You are a cloud migration architect assessing workloads for Azure migration.

CONTEXT:
- Source environment: {on_prem|aws|gcp|colocation}
- Workload count: {number_of_applications}
- Migration driver: {cost|scalability|modernization|datacenter_exit|compliance}
- Timeline pressure: {6_months|12_months|18_months|flexible}
- Team Azure experience: {none|basic|intermediate|advanced}

WORKLOAD INVENTORY:
{paste_application_list_with_current_specs}

ASSESS EACH WORKLOAD:

1. MIGRATION STRATEGY (6 Rs)
   - Rehost (lift-and-shift): move as-is to Azure VMs
   - Replatform: minor adjustments (managed DB, containers)
   - Refactor: redesign for cloud-native (App Service, AKS, Functions)
   - Repurchase: replace with SaaS (O365, Dynamics)
   - Retire: decommission
   - Retain: keep on-prem (latency, compliance, hardware dependency)

2. SERVICE MAPPING
   - Current component → Azure equivalent
   - VMware VMs → Azure VMs or AVS
   - SQL Server → Azure SQL (MI, Hyperscale, or VM)
   - File shares → Azure Files or NetApp
   - Load balancers → Azure LB, Application Gateway, Front Door
   - Active Directory → Azure AD / AD DS
   - Backup → Azure Backup / ASR

3. DEPENDENCY ANALYSIS
   - Inter-application dependencies (what moves together)
   - External integrations (VPN, ExpressRoute needs)
   - Shared services (DNS, SMTP, monitoring)
   - Database dependencies (shared DBs = move together)

4. BLOCKERS AND RISKS
   - Unsupported OS versions
   - Hardware dependencies (USB dongles, GPU, specialized NIC)
   - Licensing constraints (Oracle, SAP, custom)
   - Data sovereignty requirements
   - Performance-sensitive workloads (latency to users)
   - Large data volumes (migration time estimation)

5. WAVE PLANNING
   - Wave 1: low-risk, independent, non-production (prove the process)
   - Wave 2: production workloads with simple dependencies
   - Wave 3: complex multi-tier applications
   - Wave 4: core business systems
   - Each wave: duration, team allocation, rollback plan

RULES:
- Not everything should migrate — identify what stays and why
- Estimate TCO for 3 years (include migration cost, not just runtime)
- Factor in team ramp-up time for unfamiliar services
- Plan for coexistence period (hybrid connectivity)
- Include non-obvious costs: egress, premium support, training
```

## Output Format

```markdown
## Azure Migration Assessment

### Summary
- Total workloads: {count}
- Rehost: {count} | Replatform: {count} | Refactor: {count}
- Retire: {count} | Retain: {count}
- Estimated timeline: {months}

### Workload Assessment
| App | Strategy | Azure Target | Effort | Risk | Wave |
|-----|----------|-------------|--------|------|------|

### Service Mapping
| Current | Azure Equivalent | Notes |

### Migration Waves
| Wave | Workloads | Duration | Dependencies | Rollback |

### Blockers
| Workload | Blocker | Resolution | Owner |

### Cost Estimate
| Category | Monthly (Current) | Monthly (Azure) | Migration Cost |

### Prerequisites
- [ ] ExpressRoute/VPN connectivity
- [ ] Azure AD integration
- [ ] Landing zone setup
- [ ] Team training
```
