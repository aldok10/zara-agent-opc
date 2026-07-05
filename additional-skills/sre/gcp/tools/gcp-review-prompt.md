# GCP Architecture Review Prompt

You are performing an architecture review of a Google Cloud Platform deployment. Analyze the provided Terraform, YAML configs, IAM policies, and architecture diagrams to identify issues, risks, and improvement opportunities.

## Review Framework

### 1. Identity and Access

- Are workloads using Workload Identity Federation (not service account keys)?
- Are custom roles or predefined roles used instead of primitive roles (Owner/Editor/Viewer)?
- Is the default compute service account removed from all workloads?
- Are organization policies enforced (disable SA key creation, restrict external IPs)?
- Are IAM Conditions used to scope access (time, resource attributes)?
- Is there a break-glass procedure with appropriate auditing?

### 2. Networking

- Are workloads in a Shared VPC or project-level VPC with appropriate segmentation?
- Are private Google Access and Private Service Connect configured?
- Are firewall rules following least-privilege (specific source/dest, not 0.0.0.0/0)?
- Is Cloud NAT configured for outbound from private instances?
- Are VPC Service Controls perimeters protecting sensitive data?
- Is Cloud Armor configured for public-facing services?

### 3. Compute and Scaling

- GKE: Autopilot preferred? Workload Identity enabled? Pod security enforced?
- Cloud Run: appropriate concurrency, min/max instances, CPU allocation?
- Compute Engine: managed instance groups, no public IPs, OS patch management?
- Are scaling policies appropriate for traffic patterns?
- Is there cost protection (max instance limits, budget alerts)?

### 4. Data and Storage

- Is encryption at rest using CMEK for sensitive data?
- Are Cloud SQL instances private (no public IP)?
- Is Cloud SQL using IAM authentication where possible?
- Are backups configured with appropriate retention and tested?
- Is BigQuery using column-level security and authorized views?
- Are GCS buckets uniformly access-controlled (not ACLs)?
- Is data residency enforced via organization policies?

### 5. Reliability

- Are services deployed across multiple zones/regions?
- Are health checks and auto-healing configured?
- Is there a disaster recovery plan with defined RTO/RPO?
- Are circuit breakers and retry policies configured for service mesh?
- Are dependencies identified and SLOs defined?
- Is Cloud Load Balancing used with appropriate health checks?

### 6. Observability

- Are structured logs (JSON) being sent to Cloud Logging?
- Are SLIs/SLOs defined in Cloud Monitoring?
- Is distributed tracing configured (Cloud Trace)?
- Are alerting policies actionable (not noisy)?
- Is log-based metrics used for business-relevant signals?
- Are dashboards available for on-call response?

### 7. Cost

- Are committed use discounts applied for stable workloads?
- Are recommendations from Active Assist being acted on?
- Is there cost attribution via labels on all resources?
- Are non-prod environments scaled down or scheduled?
- Are storage lifecycle policies configured (nearline, archive)?
- Is there a billing budget with alerts?

## Output Format

For each finding:
```
[SEVERITY: CRITICAL|HIGH|MEDIUM|LOW|INFO]
[CATEGORY: identity|network|compute|data|reliability|observability|cost]
Resource: <resource identifier>
Issue: <concise description>
Risk: <impact if not addressed>
Recommendation: <specific action with example>
Reference: <Google Cloud documentation link or best practice guide>
```

## Scoring

Rate the architecture on each dimension (1-5):
- Security Posture: /5
- Reliability: /5
- Cost Efficiency: /5
- Operational Excellence: /5
- Performance: /5

## Context to Provide

When using this prompt, include:
- Terraform configurations or Cloud Console exports
- IAM policy bindings
- Network topology (VPC, subnets, firewall rules)
- Service architecture diagram or description
- Traffic patterns and scale requirements
- Compliance requirements (if any)
- Budget constraints
