---
type: fact
title: "IAM and Workload Identity Federation"
---

# IAM and Workload Identity Federation

## Principles

- Google Cloud IAM: who (principal) can do what (role) on which resource
- Deny policies: explicit denies that override allow (defense in depth)
- Organization policies: constraints applied to entire org/folder/project
- Principle of least privilege: minimal roles, scoped to specific resources

## Workload Identity Federation (WIF)

- Replaces service account keys for external workloads (CI/CD, other clouds)
- Workload identity pool: logical grouping of external identities
- Provider: maps external IdP (GitHub, GitLab, AWS, Azure AD, OIDC) to pool
- Attribute mapping: map external token claims to Google attributes
- Attribute conditions: restrict which external identities can authenticate

### GitHub Actions Setup

```hcl
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository_owner == '${var.github_org}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

### Direct Resource Access (Preferred)

- Grant roles directly to external identity without service account impersonation
- Principal format: `principal://iam.googleapis.com/projects/NUM/locations/global/workloadIdentityPools/POOL/subject/SUBJECT`
- PrincipalSet for broader matching: `principalSet://...attribute.repository/org/repo`
- Fewer moving parts, no intermediate service account

### Service Account Impersonation (When Needed)

- External identity impersonates a GSA for accessing resources
- Required when: target API doesn't support WIF principals directly
- Grant `roles/iam.workloadIdentityUser` on the GSA to the WIF principal
- Short-lived tokens (1 hour default, configurable)

## Service Accounts

- Per-workload service accounts (never use default compute SA)
- Disable key creation at org level (`constraints/iam.disableServiceAccountKeyCreation`)
- If keys unavoidable: rotate every 90 days, use IAM conditions to restrict
- Service account impersonation over key distribution
- Use IAM Conditions for time-based or resource-based access

## IAM Conditions

- Restrict access by: time, resource name, resource type, IP, device state
- Example: allow deploy only during business hours
- Example: restrict access to resources with specific labels
- CEL (Common Expression Language) for condition expressions

```yaml
condition:
  title: "business-hours-only"
  expression: |
    request.time.getHours("America/New_York") >= 9 &&
    request.time.getHours("America/New_York") <= 17 &&
    request.time.getDayOfWeek("America/New_York") >= 1 &&
    request.time.getDayOfWeek("America/New_York") <= 5
```

## Organization Policies

- Constraints enforced across org/folder/project hierarchy
- Key constraints:
  - `iam.disableServiceAccountKeyCreation`: eliminate key sprawl
  - `compute.vmExternalIpAccess`: no public IPs on VMs
  - `compute.restrictSharedVpcSubnetworks`: control network access
  - `storage.uniformBucketLevelAccess`: enforce uniform IAM on GCS
  - `run.allowedIngress`: restrict Cloud Run to internal only

## IAM Recommender

- Analyzes last 90 days of activity, suggests role reductions
- Recommends removing unused permissions from custom roles
- Identifies service accounts that haven't been used
- Lateral movement insights: highlight over-permissioned accounts
- Integrate recommendations into quarterly access reviews

## Deny Policies

- Explicit deny rules that override all allow policies
- Use for: preventing accidental public exposure, blocking dangerous permissions
- Apply at org level for org-wide guardrails
- Example: deny `setIamPolicy` on production projects except break-glass group
- Deny rules evaluated before allow rules

## Audit Logging

- Admin Activity logs: always on, free (who changed what)
- Data Access logs: opt-in, shows who accessed data (can be expensive)
- Enable data access logs for sensitive projects/services
- Export to BigQuery for analysis and alerting
- Alert on: role grants, service account key creation, org policy changes

## Anti-Patterns

- Using primitive roles (Owner/Editor/Viewer) -- use predefined or custom
- Default service account on any workload
- Service account keys committed to repos or shared
- Not using organization policies to enforce guardrails
- Granting roles at project level when resource-level is possible
- Over-broad `principalSet` conditions in WIF (match too many identities)
