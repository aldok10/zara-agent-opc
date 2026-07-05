# DNS

CoreDNS, Route53, Cloud DNS, DNSSEC, and split-horizon patterns.

## When to Load
- Configuring Kubernetes DNS (CoreDNS)
- Setting up cloud DNS (Route53, Cloud DNS)
- Implementing split-horizon DNS
- Troubleshooting DNS resolution failures

## Key Concepts

**DNS in Kubernetes:** CoreDNS resolves service names. Pod DNS policy: ClusterFirst (default, use cluster DNS), Default (node's resolv.conf), None (custom).

**Service discovery pattern:** `<service>.<namespace>.svc.cluster.local`

**Cloud DNS:** Route53 (AWS), Cloud DNS (GCP), Azure DNS. Support for public and private hosted zones.

**Split-horizon:** same domain resolves differently based on source (internal vs external). Private hosted zones override public for VPC traffic.

**DNSSEC:** cryptographic signing of DNS records. Prevents spoofing/poisoning. Chain of trust from root to zone.

## Patterns

**CoreDNS custom configuration (Corefile):**
```
.:53 {
    errors
    health { lameduck 5s }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    forward . /etc/resolv.conf { max_concurrent 1000 }
    cache 30
    loop
    reload
    loadbalance
}

# Custom forward zone for internal services
internal.company.com:53 {
    forward . 10.0.0.2 10.0.0.3
    cache 60
}
```

**Route53 private hosted zone (Terraform):**
```hcl
resource "aws_route53_zone" "internal" {
  name = "internal.company.com"

  vpc {
    vpc_id = aws_vpc.main.id
  }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "api.internal.company.com"
  type    = "A"

  alias {
    name                   = aws_lb.internal.dns_name
    zone_id                = aws_lb.internal.zone_id
    evaluate_target_health = true
  }
}
```

**ExternalDNS for automatic DNS from Kubernetes:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    external-dns.alpha.kubernetes.io/hostname: web.example.com
    external-dns.alpha.kubernetes.io/ttl: "300"
spec:
  type: LoadBalancer
  ports:
    - port: 80
```

## Gotchas
- CoreDNS `ndots:5` default causes 4 extra lookups for external names -- reduce to 2 for performance
- Route53 private zones don't work across accounts without RAM (Resource Access Manager) sharing
- DNS caching: TTL is a suggestion, not a guarantee -- clients may cache longer
- DNSSEC validation failures cause SERVFAIL, not fallback to unsigned
- CoreDNS pods need enough replicas for cluster size (default 2 may not be enough at scale)
- Split-horizon: VPN clients may not use the private zone resolver

## Verification
- `kubectl exec -it dnsutils -- nslookup <service>` from within cluster
- `dig +trace <domain>` for full resolution path
- `dig @<resolver> <domain> +dnssec` for DNSSEC validation
- `kubectl logs -n kube-system -l k8s-app=kube-dns` for CoreDNS logs
- `aws route53 test-dns-answer --hosted-zone-id <id> --record-name <name> --record-type A`
- CoreDNS metrics: `coredns_dns_requests_total`, `coredns_dns_responses_total`
