# References

## Cilium (7 refs)
- **Cilium Documentation** -- https://docs.cilium.io/ -- eBPF-based networking, security, and observability for Kubernetes
- **Cilium Network Policies** -- https://docs.cilium.io/en/stable/security/policy/ -- L3/L4/L7 policy enforcement
- **Cilium Service Mesh** -- https://docs.cilium.io/en/stable/network/servicemesh/ -- Sidecar-free service mesh with eBPF
- **Hubble** -- https://docs.cilium.io/en/stable/observability/ -- Network observability and flow visualization
- **Cilium BGP** -- https://docs.cilium.io/en/stable/network/bgp-control-plane/ -- BGP peering for pod IP advertisement
- **Cilium Cluster Mesh** -- https://docs.cilium.io/en/stable/network/clustermesh/ -- Multi-cluster connectivity
- **Cilium Gateway API** -- https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/ -- Gateway API implementation

## Service Mesh (6 refs)
- **Istio Documentation** -- https://istio.io/latest/docs/ -- Service mesh: traffic management, security, observability
- **Linkerd Documentation** -- https://linkerd.io/2/overview/ -- Lightweight Kubernetes service mesh
- **Envoy Proxy** -- https://www.envoyproxy.io/docs/ -- L7 proxy and communication bus (CNCF graduated)
- **Consul Connect** -- https://developer.hashicorp.com/consul/docs/connect -- Service mesh with HashiCorp Consul
- **SPIFFE/SPIRE** -- https://spiffe.io/docs/ -- Universal identity framework for workloads
- **mTLS** -- https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication -- Mutual TLS between services

## DNS (5 refs)
- **CoreDNS** -- https://coredns.io/manual/toc/ -- Flexible DNS server for Kubernetes service discovery
- **ExternalDNS** -- https://kubernetes-sigs.github.io/external-dns/ -- Automatic DNS record management from Kubernetes
- **AWS Route 53** -- https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ -- Managed DNS and traffic routing
- **Cloudflare DNS** -- https://developers.cloudflare.com/dns/ -- Authoritative DNS with DDoS protection
- **DNSSEC** -- https://www.cloudflare.com/dns/dnssec/how-dnssec-works/ -- DNS response authentication

## TLS & Certificates (5 refs)
- **cert-manager** -- https://cert-manager.io/docs/ -- Automated certificate management for Kubernetes
- **Let's Encrypt** -- https://letsencrypt.org/docs/ -- Free automated TLS certificates via ACME
- **ACME Protocol** -- https://datatracker.ietf.org/doc/html/rfc8555 -- Automated Certificate Management Environment spec
- **step-ca** -- https://smallstep.com/docs/step-ca -- Private ACME CA for internal services
- **TLS Best Practices** -- https://wiki.mozilla.org/Security/Server_Side_TLS -- Mozilla server-side TLS configuration

## Load Balancing (6 refs)
- **MetalLB** -- https://metallb.universe.tf/ -- Load-balancer for bare-metal Kubernetes
- **HAProxy Documentation** -- https://docs.haproxy.org/ -- High-performance TCP/HTTP load balancer
- **NGINX Ingress Controller** -- https://kubernetes.github.io/ingress-nginx/ -- Kubernetes ingress with NGINX
- **Traefik** -- https://doc.traefik.io/traefik/ -- Cloud-native reverse proxy and load balancer
- **AWS ALB/NLB** -- https://docs.aws.amazon.com/elasticloadbalancing/ -- Managed load balancing services
- **Envoy Load Balancing** -- https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing -- L7 LB algorithms and health checking

## Network Policy & Security (5 refs)
- **Kubernetes NetworkPolicy** -- https://kubernetes.io/docs/concepts/services-networking/network-policies/ -- Pod-level network segmentation
- **Calico Network Policy** -- https://docs.tigera.io/calico/latest/network-policy/ -- Extended network policy with GlobalNetworkPolicy
- **Network Policy Editor** -- https://editor.networkpolicy.io/ -- Visual Kubernetes network policy builder
- **eBPF for Networking** -- https://ebpf.io/what-is-ebpf/#networking -- Programmable packet processing in kernel
- **WireGuard** -- https://www.wireguard.com/ -- Modern VPN tunnel for encrypted cluster connectivity

## IPv6 & Advanced Topics (4 refs)
- **Kubernetes Dual-Stack** -- https://kubernetes.io/docs/concepts/services-networking/dual-stack/ -- IPv4/IPv6 dual-stack networking
- **Tailscale** -- https://tailscale.com/kb -- WireGuard-based mesh VPN for zero-trust networking
- **Submariner** -- https://submariner.io/docs/ -- Multi-cluster networking across Kubernetes clusters
- **Skupper** -- https://skupper.io/docs/ -- Multi-cluster layer 7 connectivity

## Observability (4 refs)
- **Hubble CLI** -- https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/ -- Network flow observability tool
- **Goldpinger** -- https://github.com/bloomberg/goldpinger -- Cluster connectivity visualization
- **Cilium Network Metrics** -- https://docs.cilium.io/en/stable/observability/metrics/ -- Prometheus metrics for network flows
- **TCP/IP Illustrated** -- https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/ -- Fundamental networking reference
