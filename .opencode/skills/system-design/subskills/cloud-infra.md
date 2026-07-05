---
type: subskill
title: "Cloud Infrastructure: Cloud Architecture & Infrastructure"
---

# Cloud Infrastructure: Cloud Architecture & Infrastructure

Deep-dive reference for cloud building blocks and when to use each.

## Compute

- **Containers** (EKS/GKE): microservices, consistent packaging, orchestration. Default for multi-service apps.
- **Serverless** (Lambda/Cloud Functions): event-driven, spiky load, no infra management. Watch **cold starts**.
- **VMs** (EC2/GCE): legacy apps, GPU workloads, full OS control, long-running stateful.

## Storage

- **Object** (S3/GCS): unstructured blobs, static assets, backups, data lake. Cheap, durable.
- **Block** (EBS/Persistent Disk): low-latency volumes attached to one instance (DB data).
- **Shared filesystem** (EFS/Filestore): multiple instances mount the same FS.
- **Tiering** for cost: hot → warm → cold/archive (S3 Standard → IA → Glacier).

## Managed Databases

- **Relational**: RDS / Cloud SQL.
- **Key-value**: DynamoDB / Bigtable.
- **Document**: DocumentDB / Firestore.
- **Cache**: ElastiCache / Memorystore.

Managed = less ops (patching, backups, failover) at higher cost + less control.

## Networking

- **VPC**: isolated network boundary.
- **Subnets**: public (internet-facing) vs private (internal only).
- **Security groups**: instance-level firewall (allow rules).
- **NAT gateway**: lets private subnets reach the internet outbound without being reachable inbound.
- **Load balancer**: ALB (L7/HTTP) vs NLB (L4/TCP, ultra-fast).

## Kubernetes  --  When (and When Not)

Use when: **5+ services**, need autoscaling, rolling deploys, self-healing, standardized deploy. **Not for <5 services**  --  the ops overhead (control plane, YAML, upgrades, networking) outweighs benefits. Managed control plane (EKS/GKE) reduces but doesn't eliminate the burden.

## Serverless  --  When

Spiky/unpredictable load, event-driven glue, no desire to manage servers, pay-per-use economics. Concern: **cold-start latency**, execution time limits, vendor lock-in, harder local dev.

## Multi-Region

For **low global latency** OR **disaster recovery**.
- **Active-active**: traffic to all regions. Complex (data consistency, conflict resolution) but resilient + low latency.
- **Active-passive**: one live, one standby. Simpler, cheaper, failover downtime + potential data loss (RPO/RTO).

## Cost Optimization

- **Reserved instances / committed use**: ~**70% savings** for steady baseline load.
- **Spot / preemptible**: up to **90% savings** for fault-tolerant, interruptible work (batch, CI).
- **Right-sizing**: match instance to actual utilization (most fleets are over-provisioned).
- **Autoscaling**: pay for what you use, scale to zero where possible.

## Infrastructure as Code

- **Terraform**: multi-cloud, declarative HCL, state management. Industry standard.
- **Pulumi**: IaC in real languages (TS/Python/Go).
- **CDK**: AWS-native, TypeScript/Python, compiles to CloudFormation.

## Service Mesh

Istio / Linkerd for mTLS, traffic shifting, retries, observability across services. Cost: **~5–10ms latency per hop** + operational complexity. Only worth it at **10+ services**.

## CI/CD in Cloud

GitHub Actions, GitLab CI, Dagger (portable pipelines). Deploy strategies: **blue/green** (instant switch, easy rollback), **canary** (gradual %), **progressive delivery** (flag-driven).

## Anti-Patterns

- Region lock-in without a reason.
- Over-provisioning "just in case."
- No autoscaling → pay for peak 24/7.
- No disaster recovery plan.
- Running everything in K8s regardless of scale.
