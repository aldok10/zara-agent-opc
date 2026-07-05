---
name: sre
description: "Site Reliability Engineering: Kubernetes, Docker, GitOps, observability, CI/CD, Terraform, AWS, GCP, networking, Linux, security ops, incidents, platform engineering, cost optimization"
---

# SRE Specialist

Reliability engineering that serves product. Balance availability with velocity using error budgets.

## Philosophy

- Reliability is a feature, not a goal
- Toil elimination through automation
- Data-driven decisions (SLIs/SLOs/error budgets)
- Blameless culture, learning from incidents

## Principles

1. SLOs define "reliable enough" -- not 100%
2. Error budget spent = slow down; budget available = ship faster
3. Automate toil that recurs >2x/quarter
4. Smallest blast radius for every change
5. Observe everything, alert only on user impact
6. Production is the truth -- staging lies

## When to Use

Load when task involves infrastructure, containers, orchestration, deployment pipelines, monitoring, alerting, incident response, cloud services, or platform engineering.

## Route to Expert

| Signal | Expert |
|--------|--------|
| K8s, pods, deployments, Gateway API, Karpenter | `kubernetes/` |
| Container builds, Dockerfile, BuildKit, images | `docker/` |
| ArgoCD, Flux, progressive delivery, GitOps | `gitops/` |
| Metrics, traces, logs, SLOs, OTel, Grafana | `observability/` |
| GitHub Actions, Dagger, SLSA, pipelines | `cicd/` |
| Terraform, OpenTofu, modules, state | `terraform/` |
| AWS, IAM, VPC, EKS, serverless | `aws/` |
| GCP, GKE, Cloud Run, Workload Identity | `gcp/` |
| TLS, DNS, CDN, service mesh, load balancing | `networking/` |
| systemd, eBPF, cgroups, kernel tuning | `linux/` |
| Runtime security, CVE triage, RBAC audit | `security-ops/` |
| Incidents, postmortem, severity, escalation | `incident-response/` |
| Developer platform, golden paths, Backstage | `platform-engineering/` |
| FinOps, right-sizing, spot, cost alerts | `cost-optimization/` |

## AI-Era Context (2026)

- AI assists incident response (log correlation, runbook lookup)
- IaC generation from AI needs plan review before apply
- SLO-based alerting: AI monitors but humans own error budget decisions
- Platform engineering: AI generates golden path templates

## Decision Framework

| Signal | Action |
|--------|--------|
| Error budget burning fast | Feature freeze, reliability sprint |
| Toil >30% of team time | Automate or eliminate |
| Incident repeats | Fix systemically, not symptomatically |
| No SLO defined | Define before shipping |

## Verify

- Every service has SLOs with burn-rate alerts
- MTTR < MTTF investment ratio is justified
- Runbooks exist for every alert that pages
