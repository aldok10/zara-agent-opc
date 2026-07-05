# Azure Identity

Entra ID, managed identities, RBAC, and conditional access for secure identity management.

## When to Load
- Configuring managed identities for Azure resources
- Designing RBAC role assignments
- Setting up conditional access policies
- Troubleshooting authentication/authorization failures

## Key Concepts

**Identity types:**
- User identities (Entra ID accounts)
- Service principals (app registrations)
- Managed identities: system-assigned (tied to resource lifecycle) vs user-assigned (independent lifecycle, shareable)

**RBAC model:** Principal + Role Definition + Scope. Scope hierarchy: Management Group > Subscription > Resource Group > Resource.

**Built-in roles:** Owner, Contributor, Reader, plus 400+ service-specific roles. Custom roles for fine-grained control.

**Conditional access:** signal-based policies. Evaluate: user/group, app, device state, location, risk level. Actions: allow, block, require MFA, require compliant device.

## Patterns

**Managed identity with Key Vault (Terraform):**
```hcl
resource "azurerm_user_assigned_identity" "app" {
  name                = "app-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

resource "azurerm_key_vault_access_policy" "app" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.app.principal_id

  secret_permissions = ["Get", "List"]
}
```

**Custom RBAC role (JSON):**
```json
{
  "Name": "Container App Deployer",
  "IsCustom": true,
  "Actions": [
    "Microsoft.App/containerApps/write",
    "Microsoft.App/containerApps/read",
    "Microsoft.App/containerApps/revisions/read"
  ],
  "NotActions": [],
  "AssignableScopes": ["/subscriptions/{sub-id}/resourceGroups/{rg}"]
}
```

**Workload Identity Federation (GitHub Actions):**
```bash
az ad app federated-credential create \
  --id <app-object-id> \
  --parameters '{
    "name": "github-deploy",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:org/repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

## Gotchas
- System-assigned identity deleted when resource is deleted -- plan for this
- RBAC assignments take up to 5 minutes to propagate
- Deny assignments override role assignments (rare, used by Blueprints)
- Managed identity tokens are cached -- rotation requires new token request
- Conditional access requires Entra ID P1/P2 licensing
- Service principal secrets expire -- prefer certificates or workload identity federation
- Reader role still allows listing Key Vault secrets metadata (not values)

## Verification
- `az role assignment list --assignee <principal-id> --all`
- `az ad sp show --id <app-id>` for service principal details
- Entra ID Sign-in logs for authentication failures
- `az account get-access-token --resource <resource>` to test token acquisition
- Conditional Access "What If" tool in portal for policy simulation
