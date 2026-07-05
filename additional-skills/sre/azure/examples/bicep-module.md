---
type: example
title: "Azure Bicep Module: App Service + Key Vault"
---

# Azure Bicep Module (App Service + Key Vault)

## Context
When deploying a web application on Azure that needs secure access to secrets without hardcoding them. This module creates an App Service with managed identity, a Key Vault for secrets, and wires them together using RBAC (not access policies).

## Code/Template

```bicep
// modules/webapp-with-keyvault/main.bicep
@description('Application name used as base for all resource names')
param appName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('App Service Plan SKU')
@allowed(['B1', 'S1', 'P1v3', 'P2v3'])
param skuName string = 'S1'

@description('Runtime stack')
@allowed(['DOTNET|8.0', 'NODE|20-lts', 'PYTHON|3.12'])
param linuxFxVersion string = 'NODE|20-lts'

@description('Tags applied to all resources')
param tags object = {
  environment: 'production'
  managedBy: 'bicep'
}

// --- App Service Plan ---
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// --- App Service ---
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${appName}-app'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      alwaysOn: true
      http20Enabled: true
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'KEY_VAULT_URL'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// --- Key Vault ---
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${appName}-kv'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true // Use RBAC, not access policies
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// --- RBAC: App Service -> Key Vault Secrets User ---
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    )
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// --- Diagnostic Settings ---
resource kvDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: '${appName}-kv-diag'
  scope: keyVault
  properties: {
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 365
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
    workspaceId: logAnalyticsWorkspace.id
  }
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${appName}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
}

// --- Outputs ---
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppPrincipalId string = webApp.identity.principalId
output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultName string = keyVault.name
```

```bash
# Deploy the module
az deployment group create \
  --resource-group rg-myapp-prod \
  --template-file modules/webapp-with-keyvault/main.bicep \
  --parameters appName='myapp' skuName='P1v3' linuxFxVersion='NODE|20-lts'

# Add a secret to Key Vault
az keyvault secret set \
  --vault-name myapp-kv \
  --name "DatabaseConnectionString" \
  --value "Server=...;Database=..."

# Verify the app can read secrets
az webapp log tail --name myapp-app --resource-group rg-myapp-prod
```

## Key Points
- Use `enableRbacAuthorization: true` over legacy access policies - RBAC scales better and integrates with Azure AD PIM for just-in-time access
- Enable purge protection on Key Vault to prevent accidental or malicious permanent deletion of secrets
- Set `networkAcls.defaultAction: 'Deny'` and add VNet rules later; start locked down, open selectively
