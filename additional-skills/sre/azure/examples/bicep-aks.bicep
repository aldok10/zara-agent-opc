@description('AKS cluster with Workload Identity, Azure CNI Overlay, and monitoring')

param location string = resourceGroup().location
param clusterName string
param nodeCount int = 3
param vmSize string = 'Standard_D4s_v5'
param kubernetesVersion string = '1.30'
param logAnalyticsWorkspaceId string

@description('Enable OIDC issuer for Workload Identity')
param enableOidcIssuer bool = true

resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-09-01' = {
  name: clusterName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    kubernetesVersion: kubernetesVersion
    dnsPrefix: clusterName
    enableRBAC: true
    oidcIssuerProfile: {
      enabled: enableOidcIssuer
    }
    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }
    networkProfile: {
      networkPlugin: 'azure'
      networkPluginMode: 'overlay'
      networkPolicy: 'calico'
      podCidr: '10.244.0.0/16'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
    }
    agentPoolProfiles: [
      {
        name: 'system'
        count: nodeCount
        vmSize: vmSize
        mode: 'System'
        osType: 'Linux'
        osSKU: 'AzureLinux'
        availabilityZones: ['1', '2', '3']
        enableAutoScaling: true
        minCount: 3
        maxCount: 5
        nodeTaints: ['CriticalAddonsOnly=true:NoSchedule']
      }
      {
        name: 'workload'
        count: 3
        vmSize: 'Standard_D8s_v5'
        mode: 'User'
        osType: 'Linux'
        osSKU: 'AzureLinux'
        availabilityZones: ['1', '2', '3']
        enableAutoScaling: true
        minCount: 3
        maxCount: 20
      }
    ]
    addonProfiles: {
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalyticsWorkspaceId
        }
      }
    }
    autoUpgradeProfile: {
      upgradeChannel: 'stable'
      nodeOSUpgradeChannel: 'NodeImage'
    }
  }
  tags: {
    environment: 'production'
    managedBy: 'bicep'
  }
}

output clusterFqdn string = aksCluster.properties.fqdn
output oidcIssuerUrl string = aksCluster.properties.oidcIssuerProfile.issuerURL
output kubeletIdentityObjectId string = aksCluster.properties.identityProfile.kubeletidentity.objectId
