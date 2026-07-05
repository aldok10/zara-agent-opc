# Azure Networking

VNet design, Private Endpoints, Front Door, and Application Gateway patterns.

## When to Load
- Designing hub-spoke or mesh VNet topologies
- Configuring Private Endpoints for PaaS services
- Setting up Front Door or Application Gateway
- Troubleshooting Azure connectivity issues

## Key Concepts

**VNet fundamentals:** address space (RFC 1918), subnets, NSGs (stateful), route tables (UDR), service endpoints, private endpoints.

**Hub-spoke topology:** central hub VNet (firewall, bastion, DNS) peered to spoke VNets (workloads). Use Azure Virtual WAN for managed hub at scale.

**Private Endpoints:** project PaaS services (Storage, SQL, Key Vault) into your VNet via private IP. Eliminates public internet exposure.

**Front Door:** global L7 load balancer with WAF, CDN, and SSL offload. Origin can be any public endpoint or Private Link origin.

**Application Gateway:** regional L7 load balancer with WAF v2, URL-based routing, SSL termination.

## Patterns

**Hub-spoke with Azure Firewall:**
```
Hub VNet: 10.0.0.0/16
  AzureFirewallSubnet: 10.0.1.0/26
  AzureBastionSubnet: 10.0.2.0/26
  GatewaySubnet: 10.0.3.0/27

Spoke-1 VNet: 10.1.0.0/16 (peered to hub)
  default: 10.1.0.0/24 (UDR: 0.0.0.0/0 -> Azure Firewall)

Spoke-2 VNet: 10.2.0.0/16 (peered to hub)
  default: 10.2.0.0/24 (UDR: 0.0.0.0/0 -> Azure Firewall)
```

**Private Endpoint for Storage (Terraform):**
```hcl
resource "azurerm_private_endpoint" "storage" {
  name                = "pe-storage"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "storage-connection"
    private_connection_resource_id = azurerm_storage_account.sa.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }
}

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.rg.name
}
```

**NSG rule structure:**
```
Priority 100: Allow ALB health probes (AzureLoadBalancer tag)
Priority 200: Allow app traffic from specific subnets
Priority 300: Allow management (Bastion subnet)
Priority 4096: Deny all (implicit, but explicit for audit)
```

## Gotchas
- Private Endpoints require Private DNS Zones for name resolution -- DNS misconfiguration is the top issue
- VNet peering is non-transitive: spoke-to-spoke needs hub routing or mesh peering
- NSG on AzureFirewallSubnet is not supported
- Application Gateway requires dedicated subnet, no other resources allowed
- Front Door + Private Link origins require Standard/Premium SKU
- Subnet delegation locks subnet to specific service (e.g., Microsoft.Web)

## Verification
- `az network private-endpoint show` for PE provisioning state
- `nslookup <service>.privatelink.<zone>` from within VNet
- NSG flow logs (v2) for traffic analysis
- `az network watcher connectivity-check` for path testing
- Network Watcher IP flow verify for NSG rule hit testing
