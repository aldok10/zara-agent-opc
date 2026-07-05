---
type: fact
title: "Modern Web Server Deployment"
---

# Modern Web Server Deployment

Current patterns for deploying, configuring, and operating web servers in production.

## Caddy with Automatic TLS

Zero-configuration HTTPS:

### How It Works

- Caddy obtains and renews TLS certificates automatically via ACME (Let's Encrypt)
- No certificate management scripts, no cron jobs, no manual renewal
- Supports HTTP/2 and HTTP/3 (QUIC) out of the box
- OCSP stapling enabled by default

### Caddyfile (Simple)

```
api.example.com {
    reverse_proxy /api/* localhost:8080
    reverse_proxy /ws/* localhost:8081

    encode gzip zstd
    log {
        output file /var/log/caddy/access.log
        format json
    }
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
```

### Best For

- Small to medium deployments
- Teams without dedicated infrastructure engineers
- Services that need HTTPS without certificate management overhead
- Internal tools and developer environments

## Envoy as Edge Proxy

Programmable L4/L7 proxy for service mesh and edge:

### Key Capabilities

| Feature | Benefit |
|---------|---------|
| Dynamic configuration via xDS | Config updates without restart |
| Circuit breaking | Protect backends from overload |
| Rate limiting | External rate limit service integration |
| WASM filters | Custom logic without recompiling |
| gRPC-native | First-class gRPC support, transcoding |
| Observability | Built-in stats, tracing, access logs |

### Deployment Patterns

- **Edge proxy**: internet-facing load balancer with TLS termination
- **Service sidecar**: per-pod proxy in service mesh (Istio dataplane)
- **Middle proxy**: internal load balancer between tiers
- **Front proxy**: API gateway with routing, auth, rate limiting

### Configuration (Bootstrap)

```yaml
static_resources:
  listeners:
    - name: http
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                route_config:
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match: { prefix: "/" }
                          route: { cluster: backend_service }
  clusters:
    - name: backend_service
      type: STRICT_DNS
      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend
                      port_value: 8080
```

### Best For

- High-traffic APIs needing advanced traffic management
- Service mesh data plane (Istio, App Mesh)
- gRPC services requiring transcoding or load balancing
- Organizations needing programmable proxy behavior

## Nginx Unit

Application server supporting multiple languages with dynamic configuration:

### Key Differentiators

- Runs Python, Go, Node.js, PHP, Java, Ruby in one process
- JSON API for configuration (no reload signals, no downtime)
- Per-application process isolation
- No static file serving (pair with nginx or CDN for assets)

### Configuration (via REST API)

```json
{
    "listeners": {
        "*:8080": {
            "pass": "routes"
        }
    },
    "routes": [
        {
            "match": { "uri": "/api/*" },
            "action": { "pass": "applications/api" }
        }
    ],
    "applications": {
        "api": {
            "type": "python 3.12",
            "path": "/app",
            "module": "wsgi",
            "processes": { "max": 4, "spare": 1 }
        }
    }
}
```

### Best For

- Polyglot environments (multiple language runtimes on same server)
- Applications needing configuration changes without restarts
- Edge cases where traditional app servers are too rigid

## Hot Reload Patterns

Updating configuration or binaries without dropping connections:

### Signal-Based (Traditional)

```bash
# Nginx: graceful reload
nginx -t && kill -HUP $(cat /var/run/nginx.pid)

# Old workers finish existing connections, new workers start with new config
```

### Socket-Based (Zero Downtime)

- Systemd socket activation: systemd holds the socket, passes to new process
- SO_REUSEPORT: multiple processes bind same port, kernel distributes connections
- Binary upgrade: new binary takes over listener fd from old binary

### Container Patterns

| Pattern | Mechanism | Downtime |
|---------|-----------|----------|
| Rolling update | New pods start before old terminate | Zero (with readiness probes) |
| Blue-green | Parallel deployment, traffic switch | Zero (instant cutover) |
| Canary | Gradual traffic shift (1% → 10% → 100%) | Zero (progressive) |
| In-place reload | Config-map change triggers reload signal | Zero (if server supports) |

### Configuration Reload Without Restart

- **Caddy**: `caddy reload` (API call, validates before applying)
- **Envoy**: xDS dynamic configuration (control plane pushes updates)
- **Nginx Unit**: REST API PUT to config endpoint (atomic update)
- **HAProxy**: seamless reload via master-worker mode

## TLS Best Practices (2024+)

| Setting | Recommendation |
|---------|---------------|
| Minimum version | TLS 1.2 (prefer 1.3) |
| Cipher suites | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 |
| Certificate type | ECDSA P-256 (faster than RSA, smaller) |
| HSTS | Enable with min 1 year max-age |
| OCSP | Stapling enabled, must-staple in cert |
| CT logs | Certificate Transparency required for public trust |

## Deployment Checklist

- [ ] TLS configured with automatic renewal
- [ ] Security headers set (HSTS, CSP, X-Frame-Options)
- [ ] Access logs in structured format (JSON) shipped to aggregator
- [ ] Health check endpoint exposed for load balancer
- [ ] Graceful shutdown handles in-flight requests
- [ ] Rate limiting configured for public endpoints
- [ ] Connection limits set to prevent resource exhaustion
- [ ] Compression enabled for text responses (gzip/zstd)
- [ ] HTTP/2 enabled (HTTP/3 where supported)
- [ ] Monitoring: request latency, error rate, active connections
