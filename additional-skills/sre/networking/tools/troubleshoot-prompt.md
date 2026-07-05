---
type: tool
title: "Network Troubleshooting Workflow Prompt"
---

# Network Troubleshooting Workflow Prompt

## Purpose
Provide a systematic network troubleshooting workflow covering DNS, routing, firewalls, MTU, and application-layer connectivity issues.

## When to Use
- Service-to-service connectivity failures
- Intermittent network issues (packet loss, latency spikes)
- DNS resolution problems
- New infrastructure not reachable after deployment
- Debugging cloud networking (security groups, NACLs, routing tables)

## Prompt Template

```
You are a network engineer systematically troubleshooting a connectivity issue.

CONTEXT:
- Source: {source_host_service_ip}
- Destination: {destination_host_service_ip_port}
- Protocol: {TCP|UDP|HTTP|gRPC|custom}
- Environment: {cloud_provider|on_prem|hybrid}
- Symptom: {connection_refused|timeout|intermittent|slow|dns_failure}
- Recent changes: {deployments|network_changes|none_known}

TROUBLESHOOTING LAYERS (bottom-up):

1. DNS RESOLUTION
   - Can source resolve destination hostname?
   - Commands: dig/nslookup {hostname}, check /etc/resolv.conf
   - Check: correct IP returned? TTL reasonable? NXDOMAIN?
   - Cloud: VPC DNS settings, private hosted zones, DNS forwarding
   - Common issues: stale cache, split-horizon mismatch, missing records

2. NETWORK REACHABILITY (L3)
   - Can packets reach destination network?
   - Commands: ping, traceroute/mtr, ip route
   - Check: routing tables, default gateway, VPC route tables
   - Cloud: route tables, transit gateway routes, peering routes
   - Common issues: missing route, asymmetric routing, blackhole routes

3. PORT CONNECTIVITY (L4)
   - Is the destination port open and accepting connections?
   - Commands: telnet, nc -zv, ss -tlnp, nmap
   - Check: service listening on correct interface (0.0.0.0 vs 127.0.0.1)
   - Cloud: security groups, NACLs, NSGs, firewall rules
   - Common issues: service bound to localhost, SG missing inbound rule

4. FIREWALL / SECURITY (L3-L4)
   - Are packets being dropped by a firewall?
   - Check: iptables/nftables, cloud SGs (stateful), NACLs (stateless)
   - Cloud: VPC flow logs (accepted/rejected), firewall rule logs
   - Verify: both inbound AND outbound rules (NACLs need both)
   - Common issues: ephemeral port range blocked in NACL return traffic

5. MTU / FRAGMENTATION
   - Are large packets being dropped?
   - Commands: ping -M do -s {size}, check interface MTU
   - Cloud: VPN/tunnel overhead reduces effective MTU (typically 1400)
   - Common issues: DF bit set + path MTU too small = silent drops

6. TLS / APPLICATION LAYER (L7)
   - Connection established but protocol-level failure?
   - Commands: curl -v, openssl s_client, grpcurl
   - Check: certificate validity, SNI mismatch, protocol version
   - Common issues: expired cert, wrong CA, TLS version mismatch

7. INTERMITTENT ISSUES
   - Packet loss: mtr sustained test, check for congestion
   - Latency spikes: cross-AZ traffic, noisy neighbor, GC pauses
   - Connection resets: idle timeout (LB, NAT gateway, firewall state table)
   - Load balancer health checks failing intermittently

RULES:
- Work bottom-up: don't debug TLS if packets aren't reaching destination
- Verify from BOTH sides (source can send AND destination can receive)
- Check recent changes first  -  most issues are caused by recent deployments
- Cloud networking is stateful (SGs) AND stateless (NACLs)  -  check both
- Document each step: what was tested, what was the result
```

## Output Format

```markdown
## Network Troubleshooting Results

### Problem Statement
- Source → Destination: {details}
- Symptom: {description}

### Diagnostic Steps
| # | Layer | Test | Command | Result | Conclusion |
|---|-------|------|---------|--------|-----------|

### Root Cause
- [Identified cause with evidence]

### Resolution
- [Steps taken to fix]

### Verification
- [Confirmation connectivity works post-fix]

### Prevention
- [Monitoring or config to prevent recurrence]
```
