---
name: azure
description: "Microsoft Azure cloud engineering: AKS, Entra ID, Functions, CosmosDB, Bicep/ARM"
---

# Azure Cloud Engineering

## Scope

Azure infrastructure, identity, compute, storage, networking. AKS workloads, Entra ID (formerly Azure AD), Azure Functions, CosmosDB, Bicep IaC, ARM templates, Azure DevOps pipelines, and cost optimization.

## First Action

Identify the Azure service tier and region constraints. Check if Bicep or ARM is the IaC standard. Determine identity model (managed identity vs service principal). Read existing resource group structure before proposing changes.

## Constraints

1. Always use Managed Identity over service principals with secrets
2. Bicep preferred over ARM JSON -- ARM only for legacy compatibility
3. All resources must have resource locks on production resource groups
4. Use Azure Policy for governance enforcement, not manual checks
5. CosmosDB partition key selection is irreversible -- validate before deployment
6. AKS must use Workload Identity (pod identity is deprecated)
7. Network Security Groups (NSGs) default-deny, explicit allow
8. Key Vault for all secrets -- never store in app config or env vars
9. Use availability zones for production workloads
10. Enable diagnostic settings on all resources to Log Analytics
11. Tag all resources: environment, team, cost-center minimum
12. Use private endpoints for PaaS services in production
13. Azure Functions: prefer isolated worker model over in-process
14. Minimum TLS 1.2 everywhere, prefer 1.3

## DO NOT

1. Store secrets in App Configuration or environment variables
2. Use classic deployment model resources
3. Skip resource locks on production
4. Deploy without diagnostic settings
5. Use public endpoints for databases in production
6. Hardcode subscription IDs or tenant IDs in templates
7. Use shared access keys when Managed Identity is available
8. Deploy AKS without network policies enabled

## Route to Subskill

| Signal | Target | Why |
|--------|--------|-----|
| Identity/auth/RBAC | knowledge/entra-identity.md | Entra ID patterns |
| Kubernetes/AKS/pods | knowledge/aks-patterns.md | AKS-specific guidance |
| Bicep/IaC/template | examples/bicep-aks.bicep | IaC reference |
| Architecture review | tools/azure-review-prompt.md | Structured review |

## Verification

- [ ] All secrets in Key Vault with Managed Identity access
- [ ] Bicep `what-if` shows expected diff
- [ ] NSGs are default-deny with minimal allow rules
- [ ] Private endpoints configured for data services
- [ ] Diagnostic settings enabled
- [ ] Resource tags applied
- [ ] Availability zones configured for production
- [ ] `az deployment validate` passes

## Knowledge

- knowledge/entra-identity.md -- Azure Entra ID, managed identity, RBAC, conditional access
- knowledge/aks-patterns.md -- AKS with Workload Identity, KEDA, virtual nodes

## AI-Era Context (2026)

- Azure OpenAI Service is the primary enterprise AI endpoint. Use API Management for AI gateway patterns.
- Azure AI Foundry replaces ML Studio. Confidential computing (SEV-SNP) for sensitive AI workloads.
- Azure Container Apps with GPU support for inference.
- Bicep extensibility (providers) now GA for third-party resources.
- Azure Verified Modules (AVM) as standard for Bicep.

## Related Skills

- system-design (distributed architecture)
- security-engineering (zero trust, identity)
- sre/kubernetes (if separate k8s skill exists)
