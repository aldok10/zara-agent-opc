---
name: web-servers
description: "Nginx, Caddy, HAProxy. Reverse proxy, TLS termination, load balancing, and web server configuration."
---

# Web Servers

## Scope

Nginx, Caddy, and HAProxy configuration for reverse proxy, TLS termination, load balancing, rate limiting, caching, and static file serving. Covers both application-level and infrastructure-level web server concerns.

## First Action

Identify the web server in use (check for `nginx.conf`, `Caddyfile`, `haproxy.cfg`). Understand the deployment topology (single origin, multiple upstreams, CDN in front). Determine the primary role (reverse proxy, static files, load balancer, API gateway).

## Constraints

1. TLS 1.2 minimum, prefer TLS 1.3 for new deployments
2. HTTP/2 enabled for all HTTPS listeners
3. Security headers on all responses (HSTS, X-Frame-Options, CSP, etc.)
4. Rate limiting at the edge to protect upstream services
5. Health checks for upstream servers (active or passive)
6. Timeouts set explicitly -- never rely on infinite defaults
7. Access logs structured (JSON) for observability pipelines
8. Separate server blocks for each virtual host
9. Upstream keepalive connections to reduce latency
10. Static assets served with cache headers (immutable where possible)
11. Request body size limits set to prevent abuse
12. Graceful reload for config changes (no dropped connections)
13. Certificate auto-renewal (Let's Encrypt via Caddy or certbot)
14. Error pages customized (502/503/504 with retry guidance)
15. Compression enabled for text responses (gzip/brotli)
16. HTTP/3 (QUIC) enabled on edge/CDN listeners (Caddy native, Nginx quic module)

## DO NOT

1. Expose server version headers (server_tokens off)
2. Serve application secrets through static file locations
3. Use self-signed certificates in production
4. Configure upstream without timeout limits
5. Enable directory listing on sensitive paths
6. Use HTTP for internal service communication without network-level isolation
7. Place web server config in version control without secret redaction
8. Skip testing config before reload (nginx -t, caddy validate)
9. Use proxy_pass without preserving original Host header (when needed)

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Nginx configuration patterns | knowledge/nginx-patterns.md |
| Caddy configuration patterns | knowledge/caddy-patterns.md |
| Production Nginx reverse proxy | examples/nginx-reverse-proxy.conf |
| Caddy reverse proxy example | examples/Caddyfile |
| Configuration review | tools/web-server-review-prompt.md |

## Verification

- [ ] `nginx -t` or `caddy validate` passes
- [ ] TLS certificate valid and auto-renewing
- [ ] Security headers present (test with securityheaders.com)
- [ ] HTTP/2 enabled (verify with curl --http2)
- [ ] Rate limiting active (test with load generator)
- [ ] Upstream health checks configured
- [ ] Access logs flowing to observability pipeline
- [ ] Error pages display correctly for 502/503/504
- [ ] Graceful reload tested (no connection drops)
- [ ] SSL Labs grade A or A+

## Knowledge

- knowledge/nginx-patterns.md -- locations, upstream, caching, rate limiting
- knowledge/caddy-patterns.md -- Caddyfile, automatic HTTPS, reverse proxy

## AI-Era Context (2026)

- Caddy is the default for new deployments (automatic HTTPS, simpler config). Nginx remains dominant in existing infrastructure.
- HAProxy excels at pure TCP/HTTP load balancing with advanced health checking.
- HTTP/3 (QUIC) is production-ready in both Nginx and Caddy.
- Edge computing pushes configuration toward CDN-level (Cloudflare Workers, Fastly Compute) for request routing.
- Zero-trust networking reduces reliance on network-level isolation.

## Related Skills

- security-engineering (TLS, security headers, WAF)
- system-design (load balancing, CDN architecture)
- configuration-management (automated server provisioning)
