---
type: fact
title: "EKS Best Practices"
---

# EKS Best Practices

## Cluster Configuration

- Use EKS managed node groups or Karpenter (not self-managed ASGs)
- Control plane: always multi-AZ (managed by AWS)
- Enable envelope encryption for Secrets with customer-managed KMS key
- Private API endpoint + VPC endpoint for kubectl access
- Enable control plane logging: api, audit, authenticator, controllerManager, scheduler
- Upgrade strategy: in-place for minor versions, blue-green for major changes

## Karpenter (Node Provisioning)

- Replace Cluster Autoscaler -- faster scaling, better bin-packing
- NodePool defines instance requirements (families, sizes, architectures, zones)
- EC2NodeClass defines AMI, subnets, security groups, user data
- Use consolidation policy to reduce waste: `consolidateAfter: 30s`
- Disruption budgets: protect critical workloads during node rotation
- Drift detection: automatically replace nodes when NodePool/EC2NodeClass changes
- Spot interruption handling built-in
- Weight NodePools for priority (prefer Spot, fallback to On-Demand)

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64", "arm64"]
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m7g", "m7i", "c7g", "c7i", "r7g"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s
```

## Pod Identity (EKS Pod Identity)

- Preferred over IRSA for new clusters (simpler setup, no OIDC provider needed)
- One-time setup: install Pod Identity Agent add-on
- Associate IAM role to service account via `CreatePodIdentityAssociation`
- Supports cross-account role assumption natively
- No annotation on ServiceAccount needed (unlike IRSA)
- Scoped per namespace + service account combination
- Automatic credential rotation, no token expiry management

## Add-ons Management

- Use EKS managed add-ons where available (automatic updates, compatibility)
- Critical add-ons: vpc-cni, coredns, kube-proxy, ebs-csi-driver, pod-identity-agent
- Pin add-on versions in production, auto-update in dev
- VPC CNI: enable prefix delegation for high pod density per node
- VPC CNI: enable network policy support (built-in, no Calico needed)
- CoreDNS: tune replica count and enable NodeLocal DNS cache for scale

## Networking

- VPC CNI assigns pod IPs from VPC CIDR (routable, no overlay)
- Prefix delegation: /28 prefix per ENI slot = 16x more IPs per node
- Custom networking: pods in separate subnets from nodes (RFC 6598 space)
- Security groups for pods: apply SGs directly to individual pods
- AWS Load Balancer Controller for ALB/NLB ingress
- Gateway API support via ALB Controller for advanced routing

## Security

- Disable public endpoint or restrict to known CIDRs
- Enable audit logging and ship to security account
- Use OPA/Gatekeeper or Kyverno for admission control
- Pod security standards: enforce `restricted` baseline in production namespaces
- Image signing with AWS Signer, verify at admission
- Runtime security: GuardDuty EKS Runtime Monitoring
- Network policies: default-deny per namespace, explicit allow rules
- Secrets: External Secrets Operator syncing from Secrets Manager/Parameter Store

## Observability

- Container Insights with enhanced observability (CloudWatch agent + ADOT)
- Or: Prometheus (AMP) + Grafana (AMG) for full open-source stack
- Structured logging: JSON to stdout, collected by Fluent Bit DaemonSet
- Ship to CloudWatch Logs or OpenSearch
- Distributed tracing: ADOT collector or X-Ray daemon

## Upgrades

- EKS supports 4 minor versions simultaneously
- Upgrade control plane first, then node groups/Karpenter NodePools
- Test with `kubectl convert` for deprecated API removals
- Use Pluto or kubent to detect deprecated APIs before upgrade
- Karpenter drift handles node rotation automatically after AMI update
- Always upgrade add-ons to compatible versions with new cluster version

## Cost Optimization

- Karpenter consolidation reduces over-provisioning
- Spot for stateless workloads (multiple instance types for availability)
- Graviton (arm64) instances: ~20% cheaper, better performance
- Right-size pods: use VPA recommendations, apply as requests
- Savings Plans for baseline On-Demand capacity
- Scale to zero in non-prod with KEDA or Karpenter node TTL
