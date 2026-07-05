# Caddy

Caddyfile configuration, automatic HTTPS, reverse proxy, and plugins.

## When to Load
- Setting up Caddy as a reverse proxy
- Using automatic HTTPS with Let's Encrypt
- Configuring Caddyfile for production
- Extending Caddy with plugins

## Key Concepts

**Automatic HTTPS:** Caddy obtains and renews TLS certificates automatically via ACME (Let's Encrypt). Zero-config for public domains. Redirects HTTP to HTTPS by default.

**Configuration formats:**
- Caddyfile: human-friendly, declarative
- JSON config: full API control, dynamic updates via admin API

**Matchers:** select which requests a directive applies to. Path matchers (`/api/*`), header matchers, method matchers, remote IP matchers.

**Reverse proxy features:** health checks, load balancing, header manipulation, retries, circuit breaking -- all built in.

## Patterns

**Production Caddyfile (reverse proxy):**
```caddyfile
api.company.com {
    reverse_proxy /api/* {
        to 10.0.1.10:8080 10.0.1.11:8080 10.0.1.12:8080

        lb_policy least_conn
        health_uri /healthz
        health_interval 10s
        health_timeout 3s

        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}

        transport http {
            keepalive 30s
            keepalive_idle_conns 64
        }
    }

    handle /static/* {
        root * /srv/static
        file_server {
            precompressed gzip br
        }
        header Cache-Control "public, max-age=31536000, immutable"
    }

    handle {
        respond "Not Found" 404
    }
}
```

**Multiple sites with shared config:**
```caddyfile
(security_headers) {
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=63072000; includeSubDomains"
        -Server
    }
}

api.company.com {
    import security_headers
    reverse_proxy localhost:8080
}

dashboard.company.com {
    import security_headers
    basicauth /admin/* {
        admin $2a$14$hashhere
    }
    reverse_proxy localhost:3000
}
```

**Internal CA (for internal services):**
```caddyfile
{
    acme_ca https://ca.internal.company.com/acme/acme/directory
    acme_ca_root /etc/caddy/internal-ca.crt
}

service.internal.company.com {
    tls {
        ca https://ca.internal.company.com/acme/acme/directory
    }
    reverse_proxy localhost:8080
}
```

**Rate limiting with Caddy (using caddy-ratelimit plugin):**
```caddyfile
api.company.com {
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    reverse_proxy localhost:8080
}
```

## Gotchas
- Automatic HTTPS requires port 80 and 443 to be reachable from the internet (for ACME challenges)
- Caddy admin API (localhost:2019) should never be exposed externally
- `handle` vs `handle_path`: `handle_path` strips the matched prefix before proxying
- Ordering within Caddyfile matters: more specific matchers should come first
- On-demand TLS (per-request certificate) can be abused -- always set an `ask` endpoint
- Caddy stores certificates in `$HOME/.local/share/caddy` -- back this up or use shared storage
- Plugins require building a custom Caddy binary with `xcaddy`

## Verification
- `caddy validate --config /etc/caddy/Caddyfile` for syntax check
- `caddy adapt --config /etc/caddy/Caddyfile` to see JSON equivalent
- `curl https://localhost:2019/config/` for current running config (admin API)
- `caddy trust` to install Caddy's local CA in system trust store (for dev)
- Certificate status: admin API at `/pki/ca/local/certificates`
- `curl -vI https://domain.com` to verify TLS and headers
