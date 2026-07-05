---
type: tool
title: "GCP Architecture Design Prompt"
---

# GCP Architecture Design Prompt

## Purpose
Design GCP project structure, networking, IAM, and service architecture for new workloads or migrations.

## When to Use
- Setting up a new GCP organization or project structure
- Designing networking for a multi-tier application
- Planning IAM hierarchy and access patterns
- Architecting a new service on GCP

## Prompt Template

```
You are a GCP cloud architect designing infrastructure architecture.

CONTEXT:
- Organization type: {startup|enterprise|multi_team}
- Workload: {web_app|data_pipeline|ml_platform|microservices|hybrid}
- Scale: {small_<100_users|medium|large_>10K_users|enterprise}
- Compliance: {HIPAA|PCI|SOC2|FedRAMP|none}
- Team structure: {single_team|multi_team_shared|platform_plus_tenants}
- Existing GCP usage: {greenfield|expanding|migrating}

REQUIREMENTS:
{describe_what_the_system_needs_to_do}

DESIGN THESE COMPONENTS:

1. PROJECT STRUCTURE
   - Organization → Folders → Projects hierarchy
   - Environment separation (prod, staging, dev, shared-services)
   - Project naming conventions
   - Shared resources project (VPC, DNS, artifact registry)
   - Per-team or per-service project boundaries

2. NETWORKING
   - VPC design (shared VPC vs standalone)
   - Subnet allocation (CIDR planning, future growth)
   - Connectivity: Cloud Interconnect, VPN, peering
   - Private Google Access and Private Service Connect
   - Load balancing tier (global HTTP(S) LB, regional, internal)
   - Cloud NAT for egress, Cloud Armor for protection
   - DNS strategy (Cloud DNS zones, private vs public)

3. IAM AND SECURITY
   - Organization policies (constraints)
   - Folder-level IAM for environment isolation
   - Service account strategy (per-service, workload identity)
   - Predefined vs custom roles
   - Break-glass access procedures
   - Audit logging configuration

4. COMPUTE AND SERVICES
   - GKE vs Cloud Run vs Compute Engine decision
   - Region/zone selection (latency, compliance, cost)
   - Database choice (Cloud SQL, Spanner, Firestore, AlloyDB)
   - Messaging (Pub/Sub configuration)
   - Storage (GCS buckets, lifecycle policies, access tiers)
   - Caching (Memorystore configuration)

5. OPERATIONS
   - Monitoring (Cloud Monitoring, custom metrics, SLOs)
   - Logging (Log Router, sinks, retention)
   - Alerting policies and notification channels
   - Backup and disaster recovery
   - CI/CD integration (Cloud Build, Artifact Registry)

RULES:
- Use Shared VPC for multi-project networking (reduces complexity)
- Workload Identity over service account keys (always)
- Organization policies prevent misconfigurations at scale
- Design for least privilege from day one (harder to restrict later)
- Plan IP ranges for growth  -  CIDR exhaustion is painful to fix
- Consider data residency requirements in region selection
```

## Output Format

```markdown
## GCP Architecture Design

### Project Hierarchy
```
org/
  folders/
    prod/
      proj-app-prod
      proj-data-prod
    staging/
      proj-app-staging
    shared/
      proj-networking
      proj-security
```

### Network Design
| VPC | Subnets | CIDR | Purpose |

### IAM Model
| Level | Principal | Role | Scope |

### Service Architecture
| Component | GCP Service | Config | Region |

### Security Controls
| Control | Implementation | Monitoring |

### Estimated Monthly Cost
| Service | Specs | Estimated Cost |

### Diagram
[Architecture diagram in Mermaid or description]
```
