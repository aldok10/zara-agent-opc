# GCP Identity

Workload Identity Federation, service accounts, IAM, and organization policies.

## When to Load
- Setting up Workload Identity Federation for external identities
- Managing service accounts and IAM bindings
- Configuring organization policies (constraints)
- Troubleshooting permission denied errors

## Key Concepts

**IAM model:** Member (who) + Role (what) + Resource (where). Bindings are additive -- no explicit deny (use org policies for deny).

**Identity types:**
- Google accounts (users)
- Service accounts (applications)
- Google groups
- Workload Identity (Kubernetes pods)
- Workload Identity Federation (external -- AWS, Azure, GitHub, OIDC/SAML)

**Service account best practices:** one per microservice, minimal roles, prefer Workload Identity over keys.

**Organization policies:** constraints that restrict resource configuration across the org hierarchy. Override IAM (can't bypass with permissions).

## Patterns

**Workload Identity Federation (GitHub Actions):**
```bash
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

gcloud iam service-accounts add-iam-policy-binding sa@project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/attribute.repository/org/repo"
```

**GKE Workload Identity (pod -> SA mapping):**
```bash
gcloud iam service-accounts add-iam-policy-binding \
  app-sa@project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:project.svc.id.goog[namespace/ksa-name]"
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ksa-name
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: app-sa@project.iam.gserviceaccount.com
```

**Organization policy (restrict regions):**
```yaml
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:us-locations
    - in:europe-locations
```

## Gotchas
- GCP IAM has no explicit deny -- org policies are the closest equivalent
- IAM changes can take up to 60 seconds to propagate
- Service account key files are high-risk credentials -- prefer Workload Identity
- `roles/owner` cannot be granted via Terraform on org-level (security restriction)
- Workload Identity Federation attribute mapping errors fail silently
- Default compute service account has Editor role -- overly permissive, replace immediately
- IAM conditions (attribute-based) have limited supported resource types

## Verification
- `gcloud projects get-iam-policy <project>` for all bindings
- `gcloud iam roles describe <role>` for permissions in a role
- Policy Troubleshooter in Cloud Console for access simulation
- `gcloud asset search-all-iam-policies --query="policy:user@example.com"`
- Cloud Audit Logs (Admin Activity) for IAM change history
- `gcloud org-policies describe <constraint> --project=<project>`
