---
type: subskill
title: "HAProxy"
---

# HAProxy

ACLs, backend configuration, health checks, and stick tables for advanced load balancing.

## When to Load
- Configuring HAProxy for high-performance load balancing
- Writing ACL rules for traffic routing
- Setting up stick tables for rate limiting or session persistence
- Troubleshooting backend health or routing issues

## Key Concepts

**Architecture:** frontend (listens) -> ACL evaluation -> backend selection -> server selection -> response.

**Sections:**
- `global`: process-level settings (logging, SSL, threads)
- `defaults`: default values inherited by frontends/backends
- `frontend`: bind addresses, ACLs, use_backend rules
- `backend`: server pools, balancing, health checks
- `listen`: combined frontend + backend (simpler for single-use)

**ACLs:** conditional expressions that match traffic attributes (path, headers, source IP, SSL properties). Used for routing decisions.

**Stick tables:** in-memory key-value stores for tracking connection rates, request rates, error rates per client. Used for rate limiting and abuse detection.

## Patterns

**Full production config:**
```haproxy
global
    maxconn 50000
    log stdout format raw local0
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    mode http
    log global
    option httplog
    option dontlognull
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s
    retry-on all-retryable-errors
    retries 2

frontend https_in
    bind *:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
    bind *:80
    http-request redirect scheme https unless { ssl_fc }

    acl is_api path_beg /api/
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_health path /healthz

    use_backend api_servers if is_api
    use_backend ws_servers if is_websocket
    use_backend health_check if is_health
    default_backend web_servers

backend api_servers
    balance leastconn
    option httpchk GET /healthz
    http-check expect status 200

    server api1 10.0.1.10:8080 check inter 5s fall 3 rise 2 maxconn 100
    server api2 10.0.1.11:8080 check inter 5s fall 3 rise 2 maxconn 100
    server api3 10.0.1.12:8080 check inter 5s fall 3 rise 2 maxconn 100

backend web_servers
    balance roundrobin
    cookie SERVERID insert indirect nocache
    server web1 10.0.2.10:3000 check cookie s1
    server web2 10.0.2.11:3000 check cookie s2
```

**Stick table rate limiting:**
```haproxy
frontend https_in
    bind *:443 ssl crt /etc/haproxy/certs/

    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # Separate table for login abuse
    stick-table type ip size 50k expire 5m store http_req_rate(1m),http_err_rate(1m)
    acl is_login path_beg /auth/login
    http-request track-sc1 src if is_login
    http-request deny deny_status 429 if is_login { sc1_http_req_rate gt 10 }
```

**Connection draining for deployments:**
```haproxy
backend api_servers
    option httpchk GET /healthz
    server api1 10.0.1.10:8080 check inter 2s fall 3 rise 2 drain

# To drain a server at runtime:
# echo "set server api_servers/api1 state drain" | socat stdio /var/run/haproxy.sock
```

## Gotchas
- `maxconn` per server prevents overwhelming backends -- set based on backend capacity
- HTTP/2 multiplexing means fewer connections carry more requests -- adjust maxconn accordingly
- Stick tables are not shared across HAProxy instances (unless using peers)
- `option forwardfor` adds X-Forwarded-For but doesn't set X-Real-IP
- Health check interval too aggressive on many backends creates significant probe traffic
- SSL certificate hot-reload requires `set ssl cert` via runtime API or reload
- `timeout server` too short causes 504 on slow responses

## Verification
- `haproxy -c -f /etc/haproxy/haproxy.cfg` for config validation
- Stats page: `stats uri /haproxy-stats` in a listen section
- Runtime socket: `echo "show stat" | socat stdio /var/run/haproxy.sock`
- `echo "show table <table>" | socat stdio /var/run/haproxy.sock` for stick table data
- `show servers state` via socket for backend health status
- Prometheus exporter for metrics: `haproxy_exporter` or built-in Prometheus endpoint
