# Caddy Patterns

## Automatic HTTPS

Caddy provisions and renews TLS certificates automatically from Let's Encrypt (or ZeroSSL) for any domain that resolves to the server. No configuration needed beyond specifying the domain.

```caddyfile
example.com {
    reverse_proxy localhost:8080
}
```

This single block:
- Obtains TLS certificate automatically
- Redirects HTTP to HTTPS
- Enables HTTP/2 and HTTP/3 (QUIC)
- Renews certificate before expiry

## Caddyfile Structure

```caddyfile
# Global options
{
    email admin@example.com
    acme_ca https://acme-v02.api.letsencrypt.org/directory

    servers {
        protocols h1 h2 h3
    }

    log {
        output file /var/log/caddy/access.log
        format json
        level INFO
    }
}

# Site block
example.com {
    # Directives
}
```

## Reverse Proxy

```caddyfile
api.example.com {
    reverse_proxy /api/* {
        to localhost:8080 localhost:8081

        lb_policy least_conn
        health_uri /health
        health_interval 10s
        health_timeout 5s

        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}

        transport http {
            keepalive 30s
            keepalive_idle_conns 10
        }
    }

    reverse_proxy /ws/* {
        to localhost:8082
        transport http {
            keepalive 30s
        }
    }
}
```

## Rate Limiting

```caddyfile
example.com {
    rate_limit {
        zone dynamic_zone {
            key {remote_host}
            events 10
            window 1s
        }
    }

    reverse_proxy localhost:8080
}
```

## File Server with SPA Support

```caddyfile
app.example.com {
    root * /var/www/app
    encode gzip zstd

    # Try files, fall back to index.html for SPA routing
    try_files {path} /index.html
    file_server

    # Cache static assets aggressively
    @static path *.js *.css *.png *.jpg *.svg *.woff2
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

## Security Headers

```caddyfile
example.com {
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    reverse_proxy localhost:8080
}
```

## Logging

```caddyfile
example.com {
    log {
        output file /var/log/caddy/example.log {
            roll_size 100mb
            roll_keep 10
            roll_keep_for 720h
        }
        format json
    }

    reverse_proxy localhost:8080
}
```

## Matchers

```caddyfile
example.com {
    # Named matcher
    @api path /api/*
    @static path *.js *.css *.png *.jpg

    # Apply directives to matchers
    reverse_proxy @api localhost:8080
    file_server @static {
        root /var/www/static
    }

    # Remote IP matcher for internal access
    @internal remote_ip 10.0.0.0/8 172.16.0.0/12
    reverse_proxy @internal /admin/* localhost:9090
}
```

## Internal CA (Dev/Staging)

```caddyfile
{
    # Use internal CA for non-public domains
    local_certs
}

dev.internal:443 {
    tls internal
    reverse_proxy localhost:3000
}
```

## Caddy vs Nginx Decision

| Factor | Caddy | Nginx |
|--------|-------|-------|
| Automatic HTTPS | Built-in, zero config | Requires certbot/external |
| Config syntax | Simple, less verbose | More verbose, more flexible |
| HTTP/3 | Built-in | Requires compile flag |
| Performance | Good for most loads | Higher throughput at extreme scale |
| Ecosystem | Growing, plugin-based | Mature, extensive modules |
| Use case | New deployments, simpler setups | Existing infra, high-traffic |
