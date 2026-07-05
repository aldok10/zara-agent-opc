---
type: fact
title: "Azure Well-Architected Framework"
---

# Azure Well-Architected Framework

Five pillars for assessing and improving cloud workloads on Azure.

## Reliability

Design for failure at every layer:

- **Availability zones**: deploy across 3 zones in a region for 99.99% SLA
- **Paired regions**: use geo-redundant replication for DR (RPO < 15 minutes)
- **Health modeling**: define per-component health signals; aggregate into composite health score
- **Retry with backoff**: transient fault handling using Polly or built-in SDK retry policies
- **Circuit breaker**: prevent cascading failure when downstream services degrade
- **Deployment stamps**: independent regional deployments for blast radius isolation

Key metrics: RTO, RPO, composite SLO, failure mode coverage.

## Security

Zero-trust posture throughout:

- **Entra ID (formerly AAD)**: single identity plane for users and workload identities
- **Managed identities**: eliminate credential storage for Azure service-to-service auth
- **Network segmentation**: NSGs + private endpoints; deny public access by default
- **Key Vault**: centralized secrets, keys, and certificates with RBAC and audit logging
- **Defender for Cloud**: continuous security posture assessment and threat detection
- **Conditional Access**: context-aware policies (device compliance, location, risk level)

Principle: assume breach, verify explicitly, use least-privilege access.

## Cost Optimization

Spend efficiently without sacrificing requirements:

- **Right-sizing**: analyze CPU/memory utilization; downsize or scale-to-zero where possible
- **Reserved Instances / Savings Plans**: 1-year or 3-year commitments for steady-state workloads
- **Spot VMs**: use for fault-tolerant batch, CI/CD, and dev/test (up to 90% discount)
- **Auto-scaling**: scale out during peak, scale in during off-hours
- **Storage tiering**: hot → cool → archive lifecycle policies for blob storage
- **Cost Management + Budgets**: alerts at 80%/100% thresholds per resource group or subscription

Metric: cost per unit of business value (transaction, customer, request).

## Operational Excellence

Mature operations through automation and observability:

- **Infrastructure as Code**: Bicep or Terraform for all resource provisioning
- **CI/CD pipelines**: automated build, test, and deployment with gated approvals
- **Azure Monitor**: unified platform for metrics, logs, and distributed tracing
- **Workbooks**: custom operational dashboards combining multiple data sources
- **Safe deployment practices**: progressive exposure (canary → regional → global)
- **Chaos engineering**: Azure Chaos Studio for fault injection in production-like environments

Principle: automate toil, document decisions, practice incident response.

## Performance Efficiency

Match resources to demand:

- **Scaling strategies**: vertical (SKU upgrade) vs horizontal (instance count) vs functional (partition by workload type)
- **Caching layers**: Azure Cache for Redis, CDN for static content, application-level caching
- **Proximity placement groups**: co-locate VMs for latency-sensitive workloads
- **Async processing**: Service Bus queues decouple producers from consumers
- **Database performance**: read replicas, connection pooling, query optimization, indexing strategy
- **Load testing**: Azure Load Testing to validate performance targets before production

## Assessment Process

### Well-Architected Review

1. Complete the Azure Well-Architected Review assessment tool (online questionnaire)
2. Generate pillar-specific recommendations with priority scores
3. Map recommendations to actionable work items in Azure DevOps or GitHub Issues
4. Track improvement over time with periodic re-assessment (quarterly recommended)

### Advisor Integration

Azure Advisor provides automated recommendations across all five pillars:

| Category | Example Recommendation |
|----------|----------------------|
| Reliability | Enable zone redundancy for App Service |
| Security | Rotate expiring Key Vault secrets |
| Cost | Shut down underutilized VMs |
| Operational | Enable diagnostic logging |
| Performance | Add index to SQL query with high DTU |

### Design Principles (Cross-Cutting)

- Design for self-healing and graceful degradation
- Make security a continuous process, not a gate
- Use PaaS over IaaS when requirements allow (less operational burden)
- Test at production scale; validate assumptions with data
- Automate everything repeatable; document everything manual
- Design for evolution — workloads change, architecture must adapt

## Anti-Patterns

- Single region deployment with "DR is on the roadmap"
- Shared admin credentials across services instead of managed identity
- Over-provisioned resources with no utilization monitoring
- Manual deployments to production ("just this once")
- Treating all workloads identically regardless of business criticality
- Ignoring Azure Advisor recommendations (free insights left on the table)
