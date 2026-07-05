---
name: gcp
description: "Google Cloud Platform infrastructure: GKE, Cloud Run, BigQuery, IAM, Workload Identity Federation"
---

# GCP Infrastructure Engineering

Production GCP infrastructure with emphasis on GKE, serverless, data platform, and identity.

## Scope

Covers GKE cluster design and operations, Cloud Run service deployment, BigQuery cost-aware query patterns, IAM policy management, and Workload Identity Federation for keyless authentication. Includes Terraform/Pulumi IaC for all resources.

## First Action

When loaded: identify the GCP project structure, check for existing IaC (Terraform/Pulumi), determine active services via `gcloud projects describe` and `gcloud services list --enabled`.

## Constraints

1. Always use Workload Identity Federation -- never export service account keys
2. GKE clusters must use Autopilot mode unless specific node requirements justify Standard
3. All IAM bindings use least-privilege custom roles; avoid primitive roles (Editor/Owner)
4. BigQuery queries must include partition filters; reject full-table scans over 1TB
5. Cloud Run services must set concurrency, min-instances, and CPU allocation explicitly
6. All resources must have labels: team, env, cost-center, managed-by
7. VPC design uses Shared VPC with host/service project separation
8. Private Google Access enabled on all subnets; no public IPs on compute unless edge
9. Cloud Armor WAF policy required on all external-facing load balancers
10. GKE node pools use Spot VMs for batch/stateless; on-demand for stateful only
11. Enable Binary Authorization for container deployment gating
12. All secrets in Secret Manager with automatic rotation < 90 days
13. Terraform state in GCS bucket with object versioning and uniform bucket-level access
14. Budget alerts at 50%, 80%, 100% of monthly allocation

## DO NOT

1. Use default service accounts for any workload
2. Create firewall rules with 0.0.0.0/0 source without Cloud Armor
3. Deploy GKE Standard clusters without node auto-provisioning enabled
4. Store credentials in environment variables or config files
5. Use legacy APIs (compute.v1beta, container.v1beta1) in production IaC
6. Skip organization policy constraints for new projects
7. Create BigQuery datasets without default table expiration for temp data
8. Use gcloud commands in CI/CD -- use Terraform/Pulumi with plan+apply gates

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Kubernetes workload issues | sre-networking | Service mesh, Network Policies |
| Cost anomaly detected | sre-cost-optimization | Right-sizing, commitment discounts |
| Monitoring/alerting setup | sre-observability | Cloud Monitoring + OTel integration |
| IAM breach or audit finding | sre-security-ops | RBAC audit, compliance scanning |
| Developer self-service request | sre-platform-engineering | Golden paths, Backstage catalog |

## Verification

- [ ] Workload Identity Federation configured (no exported keys)
- [ ] All GKE workloads have resource requests/limits
- [ ] Private cluster with authorized networks only
- [ ] IAM Recommender findings addressed (no over-permissioned SAs)
- [ ] BigQuery slot reservations match workload pattern
- [ ] Cloud Run services pass `gcloud run services describe` health check
- [ ] Terraform plan shows no drift from deployed state

## Knowledge

- knowledge/gcp-gke-autopilot-patterns.md
- knowledge/workload-identity-federation-setup.md
- knowledge/bigquery-cost-controls.md
- knowledge/gcp-organization-policies.md

## AI-Era Context (2026)

- GKE Autopilot is default; Standard mode reserved for GPU/TPU workloads
- Gemini Cloud Assist integrated into console but IaC remains source of truth
- Cloud Run Gen2 supports GPUs and persistent volumes
- Workload Identity Federation supports GitHub, GitLab, and AWS cross-cloud natively
- BigQuery BI Engine auto-accelerates dashboards; manual OLAP tuning rarely needed
- Committed Use Discounts replaced by Flex CUDs with 1-hour minimum
- Config Connector v2 bridges Kubernetes-native GCP resource management

## Related Skills

- sre-networking
- sre-observability
- sre-cost-optimization
- sre-security-ops
