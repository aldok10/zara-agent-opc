# References

## Runtime Security (8 refs)
- **Falco Documentation** -- https://falco.org/docs/ -- Cloud-native runtime security and threat detection
- **Falco Rules** -- https://falco.org/docs/reference/rules/ -- Rule syntax for detecting anomalous behavior
- **Falco Plugins** -- https://falco.org/docs/plugins/ -- Extending detection to cloud services and other sources
- **Tetragon** -- https://tetragon.io/docs/ -- eBPF-based security observability and enforcement
- **KubeArmor** -- https://docs.kubearmor.io/ -- Runtime security enforcement for Kubernetes
- **Sysdig Secure** -- https://docs.sysdig.com/en/docs/sysdig-secure/ -- Container and cloud security platform
- **Tracee** -- https://aquasecurity.github.io/tracee/ -- eBPF-based runtime security and forensics
- **Linux Audit Framework** -- https://man7.org/linux/man-pages/man8/auditd.8.html -- Kernel-level system call auditing

## Vulnerability Management (7 refs)
- **Trivy** -- https://aquasecurity.github.io/trivy/ -- All-in-one security scanner for containers, IaC, code
- **Grype** -- https://github.com/anchore/grype -- Vulnerability scanner for container images and filesystems
- **Snyk Container** -- https://docs.snyk.io/scan-using-snyk/snyk-container -- Container image vulnerability analysis
- **NVD (National Vulnerability Database)** -- https://nvd.nist.gov/ -- US government CVE repository
- **OSV (Open Source Vulnerabilities)** -- https://osv.dev/ -- Distributed vulnerability database for open source
- **EPSS (Exploit Prediction)** -- https://www.first.org/epss/ -- Probability scoring for vulnerability exploitation
- **CVE Prioritization** -- https://www.cisa.gov/known-exploited-vulnerabilities-catalog -- CISA KEV catalog for urgent patches

## Kubernetes RBAC & Access Control (6 refs)
- **Kubernetes RBAC** -- https://kubernetes.io/docs/reference/access-authn-authz/rbac/ -- Role-based access control for API access
- **Pod Security Admission** -- https://kubernetes.io/docs/concepts/security/pod-security-admission/ -- Built-in pod security enforcement
- **OPA Gatekeeper** -- https://open-policy-agent.github.io/gatekeeper/website/docs/ -- Policy engine for admission control
- **Kyverno** -- https://kyverno.io/docs/ -- Kubernetes-native policy management
- **RBAC Manager** -- https://rbac-manager.docs.fairwinds.com/ -- Simplified RBAC configuration for Kubernetes
- **Least Privilege for Pods** -- https://kubernetes.io/docs/concepts/security/pod-security-standards/ -- Restricted security context enforcement

## Cloud Security Posture (5 refs)
- **Prowler** -- https://docs.prowler.com/ -- Cloud security posture assessment for AWS, GCP, Azure
- **ScoutSuite** -- https://github.com/nccgroup/ScoutSuite -- Multi-cloud security auditing tool
- **Cloud Custodian** -- https://cloudcustodian.io/docs/ -- Rules engine for cloud security and cost policies
- **Steampipe** -- https://steampipe.io/docs -- SQL-based cloud infrastructure querying
- **AWS Security Hub** -- https://docs.aws.amazon.com/securityhub/latest/userguide/ -- Aggregated security findings and compliance

## Network Security (5 refs)
- **Kubernetes NetworkPolicy** -- https://kubernetes.io/docs/concepts/services-networking/network-policies/ -- Pod-level network segmentation
- **Cilium Network Policies** -- https://docs.cilium.io/en/stable/security/policy/ -- L3/L4/L7 policy enforcement with eBPF
- **AWS Security Groups** -- https://docs.aws.amazon.com/vpc/latest/userguide/security-groups.html -- Instance-level firewall rules
- **mTLS** -- https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication -- Mutual TLS for zero-trust networking
- **Network Segmentation** -- https://csrc.nist.gov/publications/detail/sp/800-125b/final -- NIST guidance on network virtualization security

## Secret Management (5 refs)
- **HashiCorp Vault** -- https://developer.hashicorp.com/vault/docs -- Secrets management and data protection
- **External Secrets Operator** -- https://external-secrets.io/ -- Sync cloud secrets into Kubernetes
- **Sealed Secrets** -- https://github.com/bitnami-labs/sealed-secrets -- Encrypted secrets safe for Git
- **AWS Secrets Manager** -- https://docs.aws.amazon.com/secretsmanager/latest/userguide/ -- Managed secret rotation
- **SOPS** -- https://getsops.io/ -- Encrypted file editor for secret values

## Compliance & Audit (4 refs)
- **CIS Kubernetes Benchmark** -- https://www.cisecurity.org/benchmark/kubernetes -- Security configuration standards for K8s
- **kube-bench** -- https://github.com/aquasecurity/kube-bench -- CIS Kubernetes Benchmark automated checks
- **Polaris** -- https://polaris.docs.fairwinds.com/ -- Kubernetes workload configuration validation
- **Kubescape** -- https://kubescape.io/docs/ -- Kubernetes security scanning and compliance

## Incident Forensics (3 refs)
- **Kubernetes Forensics** -- https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/ -- Audit logging for investigation
- **Container Forensics** -- https://sysdig.com/blog/container-forensics/ -- Capturing evidence from running containers
- **Velero** -- https://velero.io/docs/ -- Backup and restore for forensic preservation
