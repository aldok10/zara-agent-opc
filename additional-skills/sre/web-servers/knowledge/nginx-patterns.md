# Nginx Patterns

## Server Block Structure

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/example.access.log json_combined;
    error_log /var/log/nginx/example.error.log warn;
}
```

## Location Blocks

Priority order (first match wins within type):
1. Exact match: `location = /path`
2. Preferential prefix: `location ^~ /path`
3. Regex (first match): `location ~ \.php$` or `location ~* \.jpg$`
4. Prefix (longest match): `location /path`

```nginx
# API proxy
location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}

# Static assets with aggressive caching
location /static/ {
    alias /var/www/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# Health check (no logging)
location = /health {
    access_log off;
    return 200 "ok\n";
    add_header Content-Type text/plain;
}
```

## Upstream Configuration

```nginx
upstream backend {
    zone backend_zone 64k;

    # Servers with weights
    server 10.0.1.10:8080 weight=3;
    server 10.0.1.11:8080 weight=2;
    server 10.0.1.12:8080 backup;

    # Keepalive connections to upstream
    keepalive 32;
    keepalive_requests 1000;
    keepalive_timeout 60s;

    # Load balancing method
    # round-robin (default), least_conn, ip_hash, random two
    least_conn;
}
```

## Caching

```nginx
# Define cache zone
proxy_cache_path /var/cache/nginx/api
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;

# Use cache in location
location /api/products {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_key "$request_method$request_uri";
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status;
    proxy_pass http://backend;
}
```

## Rate Limiting

```nginx
# Define rate limit zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;

# Apply rate limit
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    proxy_pass http://backend;
}

location /auth/login {
    limit_req zone=login_limit burst=5;
    limit_req_status 429;
    proxy_pass http://backend;
}
```

## Compression

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 4;
gzip_min_length 256;
gzip_types
    application/json
    application/javascript
    text/css
    text/plain
    text/xml
    application/xml;
```

## JSON Access Log

```nginx
log_format json_combined escape=json
    '{'
    '"time":"$time_iso8601",'
    '"remote_addr":"$remote_addr",'
    '"method":"$request_method",'
    '"uri":"$request_uri",'
    '"status":$status,'
    '"body_bytes_sent":$body_bytes_sent,'
    '"request_time":$request_time,'
    '"upstream_response_time":"$upstream_response_time",'
    '"http_user_agent":"$http_user_agent",'
    '"request_id":"$request_id"'
    '}';
```

## Common Mistakes

- Missing `proxy_set_header Host $host` causes upstream to see wrong hostname
- `proxy_pass http://backend/` (trailing slash) strips location prefix
- `proxy_pass http://backend` (no slash) preserves location prefix
- Using `if` in location context (use `map` or `try_files` instead)
- Not setting `client_max_body_size` (defaults to 1MB)
