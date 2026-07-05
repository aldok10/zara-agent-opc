---
type: subskill
title: "Nginx"
---

# Nginx

Location blocks, upstream configuration, caching, rate limiting, and security headers.

## When to Load
- Configuring Nginx as reverse proxy or load balancer
- Setting up caching for static or dynamic content
- Implementing rate limiting and access control
- Adding security headers and SSL configuration

## Key Concepts

**Processing order:** server block selection (Host header) -> location matching -> rewrite phase -> access phase -> content phase -> log phase.

**Location matching priority:**
1. `= /exact` -- exact match (highest priority)
2. `^~ /prefix` -- prefix match, stops regex search
3. `~ /regex` -- case-sensitive regex
4. `~* /regex` -- case-insensitive regex
5. `/prefix` -- longest prefix match (lowest)

**Upstream:** pool of backend servers with load balancing, health checks, and connection management.

## Patterns

**Reverse proxy with upstream:**
```nginx
upstream api_backends {
    least_conn;
    server 10.0.1.10:8080 weight=3;
    server 10.0.1.11:8080 weight=2;
    server 10.0.1.12:8080 backup;

    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

server {
    listen 443 ssl http2;
    server_name api.company.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }
}
```

**Caching configuration:**
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
                 max_size=1g inactive=60m use_temp_path=off;

server {
    location /api/public/ {
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_use_stale error timeout updating http_500 http_502;
        add_header X-Cache-Status $upstream_cache_status;
        proxy_pass http://api_backends;
    }
}
```

**Rate limiting:**
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://api_backends;
    }

    location /auth/login {
        limit_req zone=login_limit burst=5;
        limit_req_status 429;
        proxy_pass http://api_backends;
    }
}
```

**Security headers:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "0" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

## Gotchas
- `proxy_pass http://backend/` (trailing slash) strips the matched location prefix
- `add_header` in a location block overrides ALL headers from parent blocks
- Rate limit `burst` without `nodelay` queues requests (adds latency)
- Upstream keepalive requires `proxy_http_version 1.1` and clearing Connection header
- `proxy_next_upstream` retries can cause duplicate requests for non-idempotent methods
- `worker_connections` limits total connections (clients + upstream), not just client connections
- `resolver` directive needed for DNS-based upstream when using variables in `proxy_pass`

## Verification
- `nginx -t` for configuration syntax check
- `nginx -T` to dump full resolved configuration
- `curl -I <url>` to inspect response headers
- `/var/log/nginx/access.log` and `error.log` for request/error details
- `stub_status` module for active connections and request metrics
- `openssl s_client -connect host:443` for TLS verification
