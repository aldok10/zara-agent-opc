---
type: tool
title: "Web Server Configuration Review Prompt"
---

# Web Server Configuration Review Prompt

## Usage

Use this prompt to review web server configurations (Nginx, Caddy, HAProxy). Replace `{CONFIG}` with the configuration content and `{SERVER_TYPE}` with the server type.

## Prompt

```
You are a web server configuration expert. Review the following {SERVER_TYPE} configuration for security, performance, and correctness.

CONFIGURATION:
{CONFIG}

Review against these criteria:

1. TLS/SSL SECURITY
   - TLS 1.2+ only? (TLS 1.0/1.1 must be disabled)
   - Strong cipher suites? (ECDHE preferred, no RC4/DES/3DES)
   - HSTS header present with adequate max-age (>= 1 year)?
   - OCSP stapling enabled?
   - Certificate chain complete?
   - Session resumption configured securely?

2. SECURITY HEADERS
   - Strict-Transport-Security (with includeSubDomains and preload)
   - X-Frame-Options or Content-Security-Policy frame-ancestors
   - X-Content-Type-Options: nosniff
   - Referrer-Policy
   - Permissions-Policy
   - Server version hidden (server_tokens off / -Server header)

3. PROXY CONFIGURATION
   - Host header forwarded correctly?
   - X-Forwarded-For / X-Real-IP set?
   - X-Forwarded-Proto set?
   - Connection header handled for keepalive?
   - Timeouts appropriate (connect, send, read)?
   - upstream health checks configured?

4. PERFORMANCE
   - Compression enabled (gzip/brotli/zstd)?
   - Static assets cached with appropriate headers?
   - Keepalive connections to upstream?
   - Buffer sizes appropriate?
   - Worker processes/connections tuned for hardware?
   - HTTP/2 (and HTTP/3 if supported) enabled?

5. RATE LIMITING AND PROTECTION
   - Rate limiting on sensitive endpoints (login, API)?
   - Request body size limited (client_max_body_size)?
   - Connection limits per IP?
   - Slowloris/slow POST protection?

6. RELIABILITY
   - Upstream failover configured (next_upstream)?
   - Graceful degradation (serve stale on error)?
   - Custom error pages for 502/503/504?
   - Backup servers defined?
   - Health check intervals appropriate?

7. LOGGING AND OBSERVABILITY
   - Structured log format (JSON preferred)?
   - Request ID tracking across proxy chain?
   - Upstream response time logged?
   - Log rotation configured?
   - Health check endpoints excluded from access logs?

OUTPUT FORMAT:
- CRITICAL: Security vulnerabilities or misconfigurations that will cause failures
- WARNING: Performance issues or best practice violations
- OK: Correctly configured items (brief)
- RECOMMENDATIONS: Prioritized fixes with example configuration snippets

For each issue, provide the specific directive/line and the corrected configuration.
```
