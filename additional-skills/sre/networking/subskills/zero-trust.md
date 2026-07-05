# Zero Trust Networking

BeyondCorp, Tailscale, Cloudflare Access -- identity-based access without VPN.

## When to Load
- Replacing VPN with zero trust access
- Implementing identity-based network policies
- Configuring Tailscale or Cloudflare Access
- Designing access architecture for remote teams

## Key Concepts

**Zero trust principles:**
1. Never trust, always verify
2. Assume breach
3. Verify explicitly (identity + device + context)
4. Least privilege access
5. Micro-segmentation

**BeyondCorp model (Google's framework):** access decisions based on user identity, device posture, and context -- not network location. No privileged internal network.

**Implementation options:**
- Tailscale: WireGuard-based mesh VPN, identity from SSO, ACLs
- Cloudflare Access: reverse proxy, authenticates before traffic reaches origin
- Zscaler Private Access: cloud-delivered, app-level microsegmentation
- Google BeyondCorp Enterprise: Chrome-integrated, context-aware access

## Patterns

**Tailscale ACL policy:**
```json
{
  "acls": [
    {"action": "accept", "src": ["group:engineering"], "dst": ["tag:dev:*"]},
    {"action": "accept", "src": ["group:sre"], "dst": ["tag:prod:*"]},
    {"action": "accept", "src": ["tag:ci"], "dst": ["tag:prod:443"]},
    {"action": "accept", "src": ["autogroup:member"], "dst": ["autogroup:self:*"]}
  ],
  "tagOwners": {
    "tag:prod": ["group:sre"],
    "tag:dev": ["group:engineering"],
    "tag:ci": ["group:sre"]
  },
  "groups": {
    "group:engineering": ["user1@company.com", "user2@company.com"],
    "group:sre": ["sre1@company.com"]
  },
  "ssh": [
    {"action": "accept", "src": ["group:sre"], "dst": ["tag:prod"], "users": ["root", "deploy"]}
  ]
}
```

**Cloudflare Access application:**
```terraform
resource "cloudflare_access_application" "internal_app" {
  zone_id          = var.zone_id
  name             = "Internal Dashboard"
  domain           = "dashboard.company.com"
  session_duration = "24h"
}

resource "cloudflare_access_policy" "allow_engineering" {
  zone_id        = var.zone_id
  application_id = cloudflare_access_application.internal_app.id
  name           = "Allow Engineering"
  precedence     = 1
  decision       = "allow"

  include {
    group = [cloudflare_access_group.engineering.id]
  }

  require {
    device_posture = [cloudflare_device_posture_rule.corp_device.id]
  }
}
```

**Kubernetes with Tailscale operator:**
```yaml
apiVersion: tailscale.com/v1alpha1
kind: Connector
metadata:
  name: cluster-connector
spec:
  hostname: k8s-cluster
  subnetRouter:
    advertiseRoutes:
      - "10.96.0.0/12"
      - "10.244.0.0/16"
---
apiVersion: tailscale.com/v1alpha1
kind: ProxyGroup
metadata:
  name: ingress
spec:
  type: ingress
  replicas: 2
```

## Gotchas
- Zero trust doesn't mean no perimeter -- it means no implicit trust from network position
- Tailscale subnet routers still need network connectivity to advertised ranges
- Cloudflare Access only protects HTTP/S -- TCP services need Cloudflare Tunnel
- Device posture checks require endpoint agents deployed and configured
- SSO session expiry must align with access policy session duration
- Split tunneling: decide which traffic goes through zero trust path vs direct internet

## Verification
- Tailscale: `tailscale status` for mesh connectivity, `tailscale netcheck` for DERP relay status
- Cloudflare: Access audit logs for authentication events
- Test policy: attempt access with unauthorized identity
- `tailscale ping <host>` for direct vs relayed path verification
- Device posture: verify endpoint compliance in admin console
- Latency comparison: zero trust path vs direct connection
